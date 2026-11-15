import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Square } from "react-chessboard/dist/chessboard/types";

import PuzzleBoard from "../../components/PuzzleBoard";
import TrainingShell from "../../components/TrainingShell";

import useTrainingStore from "../../stores/TrainingStore";

import {
    applyPuzzleSetup, getDuePuzzleCount, getPuzzleThemes, loadPuzzles,
    selectPuzzle
} from "../../lib/puzzles";
import { getTacticDefinition } from "../../lib/tactics";
import { toUci } from "../../lib/chess";
import { PuzzlePackItem } from "../../training/types";

import * as styles from "./PuzzlesPage.module.css";

type PuzzleStatus = "loading" | "solving" | "revealed" | "solved" | "error";

interface PreparedPuzzle {
    fen: string;
    solution: string[];
    orientation: "white" | "black";
}

function getThemeNames(themes: string[]) {
    return themes
        .map(theme => getTacticDefinition(theme)?.name ?? theme)
        .filter((theme, index, list) => list.indexOf(theme) == index);
}

export default function PuzzlesPage() {
    const [ params, setParams ] = useSearchParams();
    const weaknesses = useTrainingStore(state => state.weaknesses);
    const progress = useTrainingStore(state => state.puzzleProgress);
    const rating = useTrainingStore(state => state.puzzleRating);
    const recordPuzzle = useTrainingStore(state => state.recordPuzzle);
    const attempts = useTrainingStore(state => state.puzzleAttempts);
    const successes = useTrainingStore(state => state.puzzleSuccesses);

    const [ puzzles, setPuzzles ] = useState<PuzzlePackItem[]>([]);
    const [ puzzle, setPuzzle ] = useState<PuzzlePackItem>();
    const [ prepared, setPrepared ] = useState<PreparedPuzzle>();
    const [ fen, setFen ] = useState("");
    const [ step, setStep ] = useState(0);
    const [ status, setStatus ] = useState<PuzzleStatus>("loading");
    const [ feedback, setFeedback ] = useState("");
    const [ lastMove, setLastMove ] = useState<{ from: Square; to: Square }>();
    const [ solvedThisSession, setSolvedThisSession ] = useState(0);
    const [ boardSize, setBoardSize ] = useState(480);
    const [ loadError, setLoadError ] = useState("");

    const attempted = useRef(false);
    const failed = useRef(false);
    const run = useRef(0);
    const timer = useRef<number>();

    const requestedTheme = params.get("theme") ?? "all";
    const dueOnly = params.get("due") == "1";
    const due = getDuePuzzleCount(progress);
    const themeNames = useMemo(() => {
        return requestedTheme == "all" ? [] : getThemeNames(getPuzzleThemes(requestedTheme));
    }, [ requestedTheme ]);

    useEffect(() => {
        function update() {
            const widthLimit = window.innerWidth > 980
                ? window.innerWidth - 580
                : window.innerWidth - 64;

            setBoardSize(Math.max(280, Math.min(540, widthLimit)));
        }

        update();
        window.addEventListener("resize", update);

        return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => {
        let active = true;

        loadPuzzles()
            .then(items => {
                if (!active) return;

                setPuzzles(items);
            })
            .catch(loadError => {
                if (!active) return;

                setStatus("error");
                setLoadError(loadError instanceof Error
                    ? loadError.message
                    : "Could not load puzzles"
                );
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!puzzles.length) return;

        startPuzzle(puzzles, requestedTheme, dueOnly);
    }, [ puzzles, requestedTheme, dueOnly ]);

    useEffect(() => {
        return () => {
            run.current++;
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, []);

    function startPuzzle(
        all: PuzzlePackItem[], theme = requestedTheme, onlyDue = dueOnly
    ) {
        if (puzzle && failed.current && !attempted.current) {
            recordAttempt(false, puzzle);
        }

        const next = selectPuzzle(
            all,
            weaknesses,
            progress,
            rating,
            theme == "all" ? undefined : theme,
            onlyDue
        );

        if (!next) {
            setStatus("error");
            setLoadError(onlyDue
                ? "No puzzles are due right now. Turn off the due filter to keep practising."
                : "There are no puzzles for this filter"
            );
            return;
        }

        const setup = applyPuzzleSetup(next);

        if (!setup) {
            setStatus("error");
            setLoadError("That puzzle could not be set up");
            return;
        }

        run.current++;

        setPuzzle(next);
        setPrepared(setup);
        setFen(setup.fen);
        setStep(0);
        setStatus("solving");
        setFeedback("");
        setLastMove(undefined);
        attempted.current = false;
        failed.current = false;
    }

    function recordAttempt(success: boolean, item: PuzzlePackItem) {
        if (attempted.current) return;

        attempted.current = true;
        recordPuzzle({
            puzzleId: item.id,
            theme: item.themes[0] ?? "calculation",
            rating: item.rating,
            success
        });

        if (success) setSolvedThisSession(current => current + 1);
    }

    function finishPuzzle(item: PuzzlePackItem) {
        setStatus("solved");
        setFeedback("Solved. The line is on the board.");
        recordAttempt(true, item);
    }

    function playOpponentReply(current: string, index: number) {
        if (!prepared || !puzzle) return;

        const reply = prepared.solution[index];
        if (!reply) return;

        const board = new Chess(current);

        try {
            const move = board.move({
                from: reply.slice(0, 2) as Square,
                to: reply.slice(2, 4) as Square,
                promotion: reply[4]
            });

            setFen(board.fen());
            setLastMove({ from: move.from as Square, to: move.to as Square });

            if (index + 1 >= prepared.solution.length) {
                finishPuzzle(puzzle);
                return;
            }

            setStep(index + 1);
        } catch {
            setStatus("error");
            setLoadError("The puzzle solution could not be replayed");
        }
    }

    function onMove(from: Square, to: Square, promotion = "q") {
        if (!puzzle || !prepared || status != "solving") return;

        const board = new Chess(fen);
        let move;

        try {
            move = board.move({ from, to, promotion });
        } catch {
            return;
        }

        const uci = toUci(move);
        const expected = prepared.solution[step];

        if (uci != expected) {
            failed.current = true;
            setStatus("solving");
            setFeedback("Not the puzzle move. Try again.");
            setLastMove(undefined);
            return;
        }

        setFen(board.fen());
        setLastMove({ from: move.from as Square, to: move.to as Square });
        setStep(step + 1);

        if (step + 1 >= prepared.solution.length) {
            finishPuzzle(puzzle);
            return;
        }

        setStatus("solving");
        setFeedback("Correct. Keep going.");

        const currentRun = run.current;
        timer.current = window.setTimeout(() => {
            if (currentRun != run.current) return;
            playOpponentReply(board.fen(), step + 1);
        }, 420);
    }

    function retry() {
        if (!prepared) return;

        run.current++;
        if (timer.current) window.clearTimeout(timer.current);
        setFen(prepared.fen);
        setStep(0);
        setStatus("solving");
        setFeedback("");
        setLastMove(undefined);
    }

    function showAnswer() {
        if (!prepared || !puzzle) return;

        recordAttempt(false, puzzle);
        run.current++;
        if (timer.current) window.clearTimeout(timer.current);

        const currentRun = run.current;
        let currentFen = prepared.fen;
        let index = 0;

        setFen(currentFen);
        setStep(0);
        setStatus("revealed");
        setLastMove(undefined);
        setFeedback("Playing the solution.");

        function playNext() {
            if (currentRun != run.current || !prepared) return;

            const uci = prepared.solution[index];

            if (!uci) {
                setFeedback("Solution complete. Review the line, then try the next puzzle.");
                return;
            }

            const board = new Chess(currentFen);

            try {
                const move = board.move({
                    from: uci.slice(0, 2) as Square,
                    to: uci.slice(2, 4) as Square,
                    promotion: uci[4]
                });

                currentFen = board.fen();
                index++;

                setFen(currentFen);
                setStep(index);
                setLastMove({ from: move.from as Square, to: move.to as Square });
                timer.current = window.setTimeout(playNext, 700);
            } catch {
                setFeedback("The solution could not be replayed.");
            }
        }

        playNext();
    }

    function jumpToSolutionStep(index: number) {
        const step = solutionSteps[index - 1];

        if (!step) return;

        run.current++;
        if (timer.current) window.clearTimeout(timer.current);

        setStatus("revealed");
        setFen(step.fen);
        setStep(index);
        setLastMove({ from: step.from, to: step.to });
        setFeedback("Solution position.");
    }

    function nextPuzzle() {
        startPuzzle(puzzles, requestedTheme);
    }

    function changeTheme(theme: string) {
        const next = new URLSearchParams(params);

        if (theme == "all") next.delete("theme");
        else next.set("theme", theme);

        next.delete("due");
        setParams(next);
    }

    function toggleDue() {
        const next = new URLSearchParams(params);

        if (dueOnly) next.delete("due");
        else next.set("due", "1");

        setParams(next);
    }

    const solutionSteps = useMemo(() => {
        if (!prepared) return [];

        const board = new Chess(prepared.fen);
        const steps: {
            san: string;
            fen: string;
            from: Square;
            to: Square;
        }[] = [];

        for (const uci of prepared.solution) {
            try {
                const move = board.move({
                    from: uci.slice(0, 2) as Square,
                    to: uci.slice(2, 4) as Square,
                    promotion: uci[4]
                });

                steps.push({
                    san: move.san,
                    fen: board.fen(),
                    from: move.from as Square,
                    to: move.to as Square
                });
            } catch {
                break;
            }
        }

        return steps;
    }, [ prepared ]);

    const definition = puzzle?.themes[0]
        ? getTacticDefinition(puzzle.themes[0])
        : undefined;
    const accuracy = attempts ? successes / attempts : 0;
    const themeOptions = Object.keys(weaknesses)
        .sort((a, b) => weaknesses[b].score - weaknesses[a].score)
        .slice(0, 10);

    return <TrainingShell
        eyebrow="Adaptive puzzle trainer"
        title={"PATTERNS,\nNOT GUESSWORK."}
        intro="Preset Lichess puzzles, tagged by motif. The trainer prefers the patterns that appear most in your analysed games and keeps a spaced review queue."
    >
        <section className={styles.stats}>
            <div className={styles.stat}>
                <span>Rating</span>
                <strong>{rating}</strong>
            </div>
            <div className={styles.stat}>
                <span>Accuracy</span>
                <strong>{Math.round(accuracy * 100)}%</strong>
            </div>
            <div className={styles.stat}>
                <span>Due reviews</span>
                <strong>{due}</strong>
            </div>
            <div className={styles.stat}>
                <span>This session</span>
                <strong>{solvedThisSession}</strong>
            </div>
        </section>

        <div className={styles.controls}>
            <div className={styles.controlGroup}>
                <label className={styles.label} htmlFor="puzzle-theme">Theme</label>
                <select
                    id="puzzle-theme"
                    className={styles.select}
                    value={requestedTheme}
                    onChange={event => changeTheme(event.target.value)}
                >
                    <option value="all">Weakest patterns first</option>
                    {themeOptions.map(theme => <option key={theme} value={theme}>
                        {getTacticDefinition(theme)?.name ?? theme}
                    </option>)}
                    {[ "fork", "pin", "xRayAttack", "backRankMate", "discoveredAttack" ]
                        .filter(theme => !themeOptions.includes(theme))
                        .map(theme => <option key={theme} value={theme}>
                            {getTacticDefinition(theme)?.name ?? theme}
                        </option>)
                    }
                </select>
            </div>

            <button
                className={dueOnly ? styles.activeToggle : styles.toggle}
                onClick={toggleDue}
            >
                Due only {due > 0 ? `(${due})` : ""}
            </button>

            <div className={styles.sessionActions}>
                <button className={styles.smallButton} onClick={retry} disabled={!prepared}>
                    Retry
                </button>
                <button
                    className={styles.smallButton}
                    onClick={showAnswer}
                    disabled={!prepared || status == "solved" || status == "revealed"}
                >
                    Show answer
                </button>
                <button className={styles.primary} onClick={nextPuzzle}>
                    Next puzzle
                    <ArrowRight size={14} aria-hidden="true"/>
                </button>
            </div>
        </div>

        <div className={styles.layout}>
            <div className={styles.boardColumn}>
                {status == "loading" && <div className={styles.boardLoading}>
                    Loading puzzle pack…
                </div>}

                {fen && <PuzzleBoard
                    fen={fen}
                    orientation={prepared?.orientation ?? "white"}
                    size={boardSize}
                    lastMove={lastMove}
                    onMove={onMove}
                    disabled={status != "solving"}
                />}

                {status == "solving" && feedback && <div className={styles.feedback}>
                    <strong>Keep trying.</strong>
                    <span>{feedback}</span>
                </div>}

                {(status == "solved" || status == "revealed") && <div className={styles.solved}>
                    <strong>{status == "solved" ? "Solved." : "Solution."}</strong>
                    <span>{feedback}</span>
                    <div className={styles.solutionMoves}>
                        {solutionSteps.map((step, index) => <button
                            key={`${step.san}-${index}`}
                            className={styles.solutionMove}
                            onClick={() => jumpToSolutionStep(index + 1)}
                        >
                            {index % 2 == 0 && <span>{Math.floor(index / 2) + 1}.</span>}
                            {step.san}
                        </button>)}
                    </div>
                </div>}

                {status == "error" && <div className={styles.wrong}>
                    <strong>Puzzle error.</strong>
                    <span>{loadError}</span>
                </div>}
            </div>

            <aside className={styles.side}>
                {puzzle && <section className={styles.card}>
                    <div className={styles.cardHead}>
                        <span className={styles.cardLabel}>This puzzle</span>
                        <span className={styles.rating}>{puzzle.rating}</span>
                    </div>

                    <div className={styles.themes}>
                        {puzzle.themes.slice(0, 4).map(theme => <button
                            key={theme}
                            className={theme == requestedTheme
                                ? `${styles.theme} ${styles.activeTheme}`
                                : styles.theme
                            }
                            onClick={() => changeTheme(theme)}
                        >
                            {getTacticDefinition(theme)?.name ?? theme}
                        </button>)}
                    </div>

                    {definition && <div className={styles.definition}>
                        <h2>{definition.name}</h2>
                        <p>{definition.definition}</p>
                    </div>}

                    <div className={styles.sourceRow}>
                        <span>Preset puzzle</span>
                        <a href={puzzle.url} target="_blank" rel="noreferrer">
                            Lichess game
                            <ArrowUpRight size={11} aria-hidden="true"/>
                        </a>
                    </div>
                </section>}

                <section className={styles.card}>
                    <div className={styles.cardHead}>
                        <span className={styles.cardLabel}>How it selects</span>
                    </div>
                    <ol className={styles.steps}>
                        <li>Due reviews come first.</li>
                        <li>Then the motifs with the highest weakness score.</li>
                        <li>Then puzzles close to your rating, not too recent.</li>
                    </ol>
                    <p className={styles.note}>
                        {themeNames.length
                            ? `Filtering for ${themeNames.join(", ")}.`
                            : "No theme filter. Your weakest patterns are mixed together."
                        }
                    </p>
                </section>

                <section className={styles.card}>
                    <div className={styles.cardHead}>
                        <span className={styles.cardLabel}>Your record</span>
                    </div>
                    <div className={styles.record}>
                        <div><span>Attempts</span><strong>{attempts}</strong></div>
                        <div><span>Solved</span><strong>{successes}</strong></div>
                        <div><span>Due</span><strong>{due}</strong></div>
                    </div>
                </section>
            </aside>
        </div>
    </TrainingShell>;
}
