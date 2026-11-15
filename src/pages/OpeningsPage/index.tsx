import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move } from "chess.js";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChessKnight, RotateCcw } from "lucide-react";
import { Square } from "react-chessboard/dist/chessboard/types";

import AiSettingsDialog from "../../components/AiSettingsDialog";
import Markdown from "../../components/CoachPanel/Markdown";
import EngineLines from "../../components/EngineLines";
import EvaluationBar from "../../components/EvaluationBar";
import { SettingsIcon } from "../../components/Icons";
import OpeningBoard from "../../components/OpeningBoard";
import TrainingShell from "../../components/TrainingShell";

import useEngine from "../../hooks/useEngine";
import useTrainingAi from "../../hooks/useTrainingAi";
import useTrainingStore from "../../stores/TrainingStore";

import { fetchChessComGames, fetchLichessGames } from "../../lib/gameImport";
import {
    buildOpeningStudies, getDeeperStudyLine, getExtendedOpeningLine,
    getOpeningLineFen, getOpeningWeaknessFacts, getRepertoireScore
} from "../../lib/openingTraining";
import { getTerminalEvaluation } from "../../lib/evaluation";
import { getOpeningContext, getOpeningName } from "../../lib/openings";
import { OpeningStudy } from "../../training/types";
import { EngineLine, Evaluation } from "../../types";

import * as styles from "./OpeningsPage.module.css";

function getLineHistory(line: string[]) {
    const board = new Chess();
    const history: string[] = [];

    for (const san of line) {
        try {
            const move = board.move(san);
            history.push(`${move.from}${move.to}${move.promotion ?? ""}`);
        } catch {
            break;
        }
    }

    return history;
}

function getLineState(line: string[], step: number) {
    const board = new Chess();
    let lastMove: { from: Square; to: Square } | undefined;

    for (let index = 0; index < step; index++) {
        try {
            const move = board.move(line[index]);
            lastMove = { from: move.from as Square, to: move.to as Square };
        } catch {
            break;
        }
    }

    return { fen: board.fen(), lastMove };
}

function formatScore(value: number) {
    return `${Math.round(value * 100)}%`;
}

export default function OpeningsPage() {
    const [ params, setParams ] = useSearchParams();
    const playerName = useTrainingStore(state => state.playerName);
    const setPlayerName = useTrainingStore(state => state.setPlayerName);
    const openings = useTrainingStore(state => state.openings);
    const importedGames = useTrainingStore(state => state.importedGames);
    const replaceOpenings = useTrainingStore(state => state.replaceOpenings);
    const setImportedGames = useTrainingStore(state => state.setImportedGames);
    const setOpeningLearning = useTrainingStore(state => state.setOpeningLearning);

    const [ username, setUsername ] = useState(playerName);
    const [ source, setSource ] = useState<"lichess" | "chesscom">("lichess");
    const [ limit, setLimit ] = useState(24);
    const [ loading, setLoading ] = useState(false);
    const [ message, setMessage ] = useState("");
    const [ error, setError ] = useState("");
    const [ boardSize, setBoardSize ] = useState(420);
    const [ showSettings, setShowSettings ] = useState(false);
    const [ selectedKey, setSelectedKey ] = useState(params.get("study") ?? "");
    const [ boardLine, setBoardLine ] = useState<string[]>([]);
    const [ boardStep, setBoardStep ] = useState(0);
    const [ boardFen, setBoardFen ] = useState(new Chess().fen());
    const [ lastMove, setLastMove ] = useState<{ from: Square; to: Square }>();
    const [ evaluation, setEvaluation ] = useState<Evaluation>();
    const [ engineLines, setEngineLines ] = useState<EngineLine[]>([]);

    const { engineRef } = useEngine();

    const pendingLine = useRef<string[]>();
    const playbackTimer = useRef<number>();
    const playbackRun = useRef(0);

    const ai = useTrainingAi();
    const studies = useMemo(() => Object.values(openings)
        .sort((a, b) => b.games - a.games), [ openings ]);
    const selected = openings[selectedKey] ?? studies[0];
    const repertoire = getRepertoireScore(studies);

    useEffect(() => {
        function update() {
            const width = window.innerWidth > 1000
                ? Math.min(460, Math.floor((window.innerWidth - 120) * 0.42))
                : window.innerWidth - 64;

            setBoardSize(Math.max(260, width));
        }

        update();
        window.addEventListener("resize", update);

        return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => {
        if (!selectedKey && selected) setSelectedKey(selected.key);
    }, [ selected, selectedKey ]);

    const extendedLine = useMemo(() => {
        if (!selected) return [];

        const deeper = getDeeperStudyLine(selected, importedGames, playerName);
        const line = deeper.length > selected.line.length
            ? deeper
            : selected.line;

        return getExtendedOpeningLine(line);
    }, [ selected, importedGames, playerName ]);

    useEffect(() => {
        const pending = pendingLine.current;

        if (pending) {
            pendingLine.current = undefined;
            startLinePlayback(pending);
            return;
        }

        stopLinePlayback();

        if (!extendedLine.length) {
            setBoardLine([]);
            setBoardStep(0);
            setBoardFen(new Chess().fen());
            setLastMove(undefined);
            return;
        }

        setBoardLine(extendedLine);
        setBoardStep(extendedLine.length);
        setBoardFen(getOpeningLineFen(extendedLine));
        setLastMove(undefined);
    }, [ extendedLine ]);

    useEffect(() => {
        return () => {
            if (playbackTimer.current) window.clearTimeout(playbackTimer.current);
        };
    }, []);

    useEffect(() => {
        const engine = engineRef.current;
        const board = new Chess(boardFen);
        let active = true;

        setEngineLines([]);

        if (!engine) return;

        if (board.isGameOver()) {
            setEvaluation(getTerminalEvaluation(boardFen));
            return;
        }

        const timer = window.setTimeout(() => {
            engine.analyse(boardFen, {
                depth: 12,
                lines: 2,
                hash: 32,
                san: true
            }).then(lines => {
                if (!active) return;

                setEngineLines(lines);
                setEvaluation(lines[0]?.evaluation);
            }).catch(() => {
                if (active) setEngineLines([]);
            });
        }, 220);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [ boardFen, engineRef ]);

    const lineHistory = useMemo(() => (
        getLineHistory(boardLine.slice(0, boardStep))
    ), [ boardLine, boardStep ]);

    const context = useMemo(() => (
        getOpeningContext(boardFen, lineHistory)
    ), [ boardFen, lineHistory ]);

    const gameOver = useMemo(() => (
        new Chess(boardFen).isGameOver()
    ), [ boardFen ]);

    async function importGames() {
        const name = username.trim();
        if (!name || loading) return;

        const count = Math.max(1, Math.min(1000, limit || 24));

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const games = source == "chesscom"
                ? await fetchChessComGames(name, count)
                : await fetchLichessGames(name, count);

            if (!games.length) throw new Error("No public games were returned");

            const built = buildOpeningStudies(games, name);

            if (!built.length) {
                throw new Error(
                    "No opening was recognised. Check that the username matches the players in those games."
                );
            }

            replaceOpenings(built);
            setImportedGames(
                games.map(game => ({ id: game.id, pgn: game.pgn })),
                source
            );
            setOpeningLearning(built[0].key, true);
            setPlayerName(name);
            setSelectedKey(built[0].key);
            setParams({ study: built[0].key });
            setMessage(
                `Imported ${games.length} recent ${source == "chesscom" ? "Chess.com" : "Lichess"} `
                + `games and found ${built.length} openings.`
            );
        } catch (requestError) {
            setError(requestError instanceof Error
                ? requestError.message
                : "Could not import games"
            );
        } finally {
            setLoading(false);
        }
    }

    function selectStudy(study: OpeningStudy) {
        setSelectedKey(study.key);
        setParams({ study: study.key });
        ai.clear();
    }

    function stopLinePlayback() {
        playbackRun.current++;
        if (playbackTimer.current) window.clearTimeout(playbackTimer.current);
    }

    function startLinePlayback(line: string[]) {
        stopLinePlayback();

        if (!line.length) return;

        const run = playbackRun.current;
        const board = new Chess();
        let index = 0;

        setBoardLine(line);
        setBoardStep(0);
        setBoardFen(board.fen());
        setLastMove(undefined);

        function playNext() {
            if (run != playbackRun.current || index >= line.length) return;

            try {
                const move = board.move(line[index]);
                index++;

                setBoardStep(index);
                setBoardFen(board.fen());
                setLastMove({
                    from: move.from as Square,
                    to: move.to as Square
                });
                playbackTimer.current = window.setTimeout(playNext, 1000);
            } catch {
                return;
            }
        }

        playbackTimer.current = window.setTimeout(playNext, 1000);
    }

    function makeMove(move: Move) {
        stopLinePlayback();

        const nextLine = [
            ...boardLine.slice(0, boardStep),
            move.san
        ];

        setBoardLine(nextLine);
        setBoardStep(nextLine.length);
        setBoardFen(move.after);
        setLastMove({
            from: move.from as Square,
            to: move.to as Square
        });
    }

    function jumpToStep(step: number) {
        stopLinePlayback();

        const state = getLineState(boardLine, step);

        setBoardStep(step);
        setBoardFen(state.fen);
        setLastMove(state.lastMove);
    }

    function playSan(san: string) {
        stopLinePlayback();

        const board = new Chess(boardFen);

        try {
            makeMove(board.move(san));
        } catch {
            return;
        }
    }

    function resetLine() {
        stopLinePlayback();

        setBoardLine(extendedLine);
        setBoardStep(extendedLine.length);
        setBoardFen(getOpeningLineFen(extendedLine));
        setLastMove(undefined);
    }

    function playLine(_startPly: number | undefined, moves: string[]) {
        const board = new Chess();
        const line: string[] = [];
        let move: Move | undefined;
        let openingName: string | undefined;

        for (const san of moves) {
            try {
                move = board.move(san);
                line.push(move.san);
                openingName = getOpeningName(board.fen()) ?? openingName;
            } catch {
                break;
            }
        }

        if (!line.length) return;

        const target = openingName
            ? studies.find(study => (
                study.name == openingName
                && study.colour == selected?.colour
            )) ?? studies.find(study => study.name == openingName)
            : undefined;

        if (target && target.key != selected?.key) {
            pendingLine.current = line;

            setSelectedKey(target.key);
            setParams({ study: target.key });
            return;
        }

        startLinePlayback(line);
    }

    function getWeaknessFacts() {
        if (!selected) return "";

        return getOpeningWeaknessFacts(studies, selected, extendedLine);
    }

    return <TrainingShell
        eyebrow="Opening learner"
        title={"PLAY WHAT\nYOU UNDERSTAND."}
        intro="Fetch your recent Chess.com or Lichess games, see which openings actually appear, then ask the coach for the plans and the traps. Book statistics come from the local opening database."
    >
        <section className={styles.importBar}>
            <div className={styles.importCopy}>
                <div className={styles.sourceTabs} role="group" aria-label="Game source">
                    <button
                        className={source == "lichess"
                            ? `${styles.source} ${styles.activeSource}`
                            : styles.source
                        }
                        aria-pressed={source == "lichess"}
                        onClick={() => setSource("lichess")}
                    >
                        Lichess
                    </button>
                    <button
                        className={source == "chesscom"
                            ? `${styles.source} ${styles.activeSource}`
                            : styles.source
                        }
                        aria-pressed={source == "chesscom"}
                        onClick={() => setSource("chesscom")}
                    >
                        Chess.com
                    </button>
                </div>

                <span className={styles.label}>
                    {source == "chesscom" ? "Chess.com" : "Lichess"} username
                </span>
                <p>
                    Public games only. The opening is taken from the deepest
                    named position in each game.
                </p>
            </div>

            <div className={styles.importForm}>
                <input
                    className={styles.input}
                    value={username}
                    placeholder={source == "chesscom" ? "e.g. Hikaru" : "e.g. DrNykterstein"}
                    onChange={event => setUsername(event.target.value)}
                    onKeyDown={event => {
                        if (event.key == "Enter") void importGames();
                    }}
                />
                <input
                    className={styles.limitInput}
                    type="number"
                    min={1}
                    max={1000}
                    value={limit}
                    aria-label="Number of games to fetch"
                    onChange={event => setLimit(Number(event.target.value))}
                />
                {[ 24, 50, 100 ].map(option => <button
                    key={option}
                    className={limit == option
                        ? `${styles.limitButton} ${styles.activeLimit}`
                        : styles.limitButton
                    }
                    onClick={() => setLimit(option)}
                >
                    {option}
                </button>)}
                <button
                    className={limit >= 1000
                        ? `${styles.limitButton} ${styles.activeLimit}`
                        : styles.limitButton
                    }
                    onClick={() => setLimit(1000)}
                    title="Fetch up to 1000 games"
                >
                    All
                </button>
                <button
                    className={styles.primary}
                    disabled={loading || !username.trim()}
                    onClick={() => void importGames()}
                >
                    {loading ? "Fetching…" : "Fetch games"}
                </button>
            </div>
        </section>

        {(message || error) && <p className={error ? styles.error : styles.message}>
            {error || message}
        </p>}

        <section className={styles.stats}>
            <div><span>Openings found</span><strong>{studies.length}</strong></div>
            <div><span>Games read</span><strong>{repertoire.games}</strong></div>
            <div><span>Score</span><strong>{repertoire.games ? formatScore(repertoire.score) : "—"}</strong></div>
            <div><span>Losses</span><strong>{repertoire.losses}</strong></div>
        </section>

        {studies.length == 0
            ? <section className={styles.empty}>
                <ChessKnight
                    className={styles.emptyMark}
                    size={54}
                    strokeWidth={1.4}
                    aria-hidden="true"
                />
                <h2>No repertoire yet</h2>
                <p>
                    Enter a Chess.com or Lichess username above. Chessassist
                    will group your recent games by opening, colour and result.
                    Nothing is uploaded and no token is needed.
                </p>
            </section>
            : <div className={styles.layout}>
                <aside className={styles.list}>
                    <div className={styles.listHead}>
                        <span>Your openings</span>
                        <span>{studies.length}</span>
                    </div>

                    {studies.map(study => {
                        const score = study.games
                            ? (study.wins + study.draws / 2) / study.games
                            : 0;

                        return <button
                            key={study.key}
                            className={study.key == selected?.key
                                ? `${styles.study} ${styles.activeStudy}`
                                : styles.study
                            }
                            onClick={() => selectStudy(study)}
                        >
                            <span className={styles.studyTop}>
                                <span className={styles.studyName}>{study.name}</span>
                                <span className={styles.studyColour}>
                                    {study.colour == "w" ? "White" : "Black"}
                                </span>
                            </span>
                            <span className={styles.studyMeta}>
                                {study.games} games · {formatScore(score)} score
                            </span>
                        </button>;
                    })}
                </aside>

                {selected && <section className={styles.detail}>
                    <header className={styles.detailHead}>
                        <div>
                            <span className={styles.label}>
                                {selected.colour == "w" ? "White" : "Black"} repertoire
                            </span>
                            <h2>{selected.name}</h2>
                        </div>
                        <div className={styles.detailActions}>
                            <button
                                className={styles.iconButton}
                                title="Opening AI settings"
                                aria-label="Opening AI settings"
                                onClick={() => setShowSettings(true)}
                            >
                                <SettingsIcon/>
                            </button>
                        </div>
                    </header>

                    <div className={styles.detailGrid}>
                        <div className={styles.boardColumn}>
                            <div className={styles.boardRow}>
                                <EvaluationBar
                                    evaluation={evaluation}
                                    flipped={selected.colour == "b"}
                                    height={boardSize}
                                />

                                <div className={styles.board}>
                                    <OpeningBoard
                                        fen={boardFen}
                                        orientation={selected.colour == "w" ? "white" : "black"}
                                        size={boardSize}
                                        lastMove={lastMove}
                                        onMove={makeMove}
                                    />
                                </div>
                            </div>

                            <div className={styles.line}>
                                <div className={styles.lineHead}>
                                    <span className={styles.lineLabel}>Line</span>
                                    <div className={styles.lineActions}>
                                        <button
                                            className={styles.lineButton}
                                            title="Back one move"
                                            aria-label="Back one move"
                                            disabled={boardStep == 0}
                                            onClick={() => jumpToStep(boardStep - 1)}
                                        >
                                            <ChevronLeft size={13} aria-hidden="true"/>
                                        </button>
                                        <button
                                            className={styles.lineButton}
                                            title="Reset line"
                                            aria-label="Reset line"
                                            onClick={resetLine}
                                        >
                                            <RotateCcw size={12} aria-hidden="true"/>
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.lineMoves}>
                                    {boardLine.length
                                        ? Array.from(
                                            { length: Math.ceil(boardLine.length / 2) },
                                            (_, row) => row
                                        ).map(row => {
                                            const white = row * 2;
                                            const black = white + 1;

                                            return <div className={styles.lineRow} key={row}>
                                                <span className={styles.lineNumber}>{row + 1}.</span>

                                                {[ white, black ].map(index => boardLine[index]
                                                    ? <button
                                                        key={`${boardLine[index]}-${index}`}
                                                        className={index < boardStep
                                                            ? styles.lineMovePlayed
                                                            : styles.lineMove
                                                        }
                                                        onClick={() => jumpToStep(index + 1)}
                                                    >
                                                        {boardLine[index]}
                                                    </button>
                                                    : <span key={index}/>
                                                )}
                                            </div>;
                                        })
                                        : <span className={styles.note}>Starting position</span>
                                    }
                                </div>
                            </div>
                        </div>

                        <div className={styles.info}>
                            <div className={styles.record}>
                                <div><span>Games</span><strong>{selected.games}</strong></div>
                                <div><span>Wins</span><strong>{selected.wins}</strong></div>
                                <div><span>Draws</span><strong>{selected.draws}</strong></div>
                                <div><span>Losses</span><strong>{selected.losses}</strong></div>
                            </div>

                            <EngineLines
                                lines={engineLines}
                                gameOver={gameOver}
                                onPlayLine={line => {
                                    const san = line.sanMoves[0];
                                    if (san) playSan(san);
                                }}
                            />

                            <div className={styles.book}>
                                <span className={styles.label}>Book moves from here</span>
                                {context?.bookMoves.length
                                    ? context.bookMoves.slice(0, 8).map(move => <button
                                        className={styles.bookMove}
                                        key={move.uci}
                                        onClick={() => playSan(move.san)}
                                    >
                                        <span>{move.san}</span>
                                        <span>{move.games} games</span>
                                        <span>{formatScore(move.whiteWin)} / {formatScore(move.draw)} / {formatScore(move.blackWin)}</span>
                                    </button>)
                                    : <p className={styles.note}>
                                        No local book statistics for this exact position.
                                    </p>
                                }
                            </div>

                            <div className={styles.aiPanel}>
                                <div className={styles.aiHead}>
                                    <span className={styles.label}>AI opening weaknesses</span>
                                    {ai.busy && <button className={styles.smallButton} onClick={ai.stop}>
                                        Stop
                                    </button>}
                                </div>

                                {ai.content
                                    ? <div className={styles.narrative}>
                                        <Markdown
                                            text={ai.content}
                                            onLine={playLine}
                                        />
                                    </div>
                                    : <p className={styles.note}>
                                        The coach ranks your openings by results, finds
                                        the line where you lose most, and teaches that
                                        position instead of a generic plan.
                                    </p>
                                }

                                {ai.error && <p className={styles.error}>{ai.error}</p>}

                                {!ai.content && <button
                                    className={styles.primary}
                                    disabled={ai.busy}
                                    onClick={() => ai.configured
                                        ? void ai.generate(
                                            "opening",
                                            getWeaknessFacts()
                                        )
                                        : setShowSettings(true)
                                    }
                                >
                                    {ai.busy ? ai.status : ai.configured
                                        ? "Find my opening weaknesses"
                                        : "Connect a model"
                                    }
                                </button>}
                            </div>
                        </div>
                    </div>
                </section>}
            </div>
        }

        <section className={styles.glossaryCallout}>
            <div>
                <span className={styles.label}>Need the vocabulary?</span>
                <h2>Every tactic, defined.</h2>
                <p>
                    Pins, x-rays, clearance, deflection, back-rank mates,
                    endgame technique and the positional terms the coach uses.
                </p>
            </div>
            <Link className={styles.secondary} to="/glossary">
                Open the glossary
                <ArrowRight size={15} aria-hidden="true"/>
            </Link>
        </section>

        {showSettings && <AiSettingsDialog
            settings={ai.settings}
            onChange={ai.setSettings}
            onClose={() => setShowSettings(false)}
        />}
    </TrainingShell>;
}
