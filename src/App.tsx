import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, Move } from "chess.js";
import { Square } from "react-chessboard/dist/chessboard/types";

import AnalysisPanel from "./components/AnalysisPanel";
import BoardArea from "./components/BoardArea";
import CoachPanel from "./components/CoachPanel";
import FloatingCat from "./components/FloatingCat";
import ImportDialog from "./components/ImportDialog";
import SettingsDialog from "./components/SettingsDialog";
import SiteHeader from "./components/SiteHeader";

import useBoardSize from "./hooks/useBoardSize";
import useEngine from "./hooks/useEngine";
import useGameAnalysis from "./hooks/useGameAnalysis";

import useSettingsStore from "./stores/SettingsStore";

import { getPlayers, parsePgn, samplePgn } from "./lib/pgn";
import { parseUci, toUci } from "./lib/chess";
import { getTerminalEvaluation } from "./lib/evaluation";
import {
    getOpeningContext, getOpeningEco, getOpeningName
} from "./lib/openings";
import { playMoveSound } from "./lib/sounds";
import { EngineLine, Evaluation, GameData, Position } from "./types";

import * as styles from "./App.module.css";

interface Variation {
    rootPly: number;
    positions: Position[];
    index: number;
}

function App() {
    const [ game, setGame ] = useState<GameData>(() => parsePgn(samplePgn));
    const [ currentPly, setCurrentPly ] = useState(0);
    const [ flipped, setFlipped ] = useState(false);
    const [ lines, setLines ] = useState<EngineLine[]>([]);
    const [ liveEvaluation, setLiveEvaluation ] = useState<Evaluation>();
    const [ showSettings, setShowSettings ] = useState(false);
    const [ showImport, setShowImport ] = useState(false);
    const [ variation, setVariation ] = useState<Variation>();

    const playbackTimer = useRef<number>();
    const playbackRun = useRef(0);

    const { engineRef, error } = useEngine();
    const boardSize = useBoardSize();

    const settings = useSettingsStore(state => state.settings);
    const setSettings = useSettingsStore(state => state.setSettings);

    const {
        analysing, progress, storedEvaluations, classifications, bestMoves,
        batchRunning, analyseGame, stopAnalysis, resetAnalysis
    } = useGameAnalysis({
        engineRef,
        positions: game.positions,
        settings
    });

    const basePosition = game.positions[Math.min(currentPly, game.positions.length - 1)];
    const variationIndex = variation?.index ?? 0;
    const variationPosition = variation && variationIndex > 0
        ? variation.positions[variationIndex - 1]
        : undefined;
    const position = variationPosition ?? basePosition;
    const players = useMemo(() => getPlayers(game), [ game ]);

    const gameOver = useMemo(() => (
        new Chess(position.fen).isGameOver()
    ), [ position.fen ]);

    const terminalEvaluation = useMemo(() => (
        gameOver ? getTerminalEvaluation(position.fen) : undefined
    ), [ gameOver, position.fen ]);

    const evaluation = gameOver
        ? terminalEvaluation
        : variation
            ? liveEvaluation
            : storedEvaluations[currentPly] ?? liveEvaluation;

    const currentClassification = variation
        ? undefined
        : classifications[currentPly];

    const history = useMemo(() => {
        const rootPly = variation?.rootPly ?? currentPly;
        const mainline = game.positions
            .slice(1, rootPly + 1)
            .map(item => item.uci ?? "");

        if (!variation) return mainline;

        return [
            ...mainline,
            ...variation.positions
                .slice(0, variation.index)
                .map(item => item.uci ?? "")
        ];
    }, [ game.positions, currentPly, variation ]);

    const opening = useMemo(() => (
        getOpeningContext(position.fen, history)
    ), [ position.fen, history ]);

    const linePositions = useMemo(() => (
        variation
            ? [
                ...game.positions.slice(0, variation.rootPly + 1),
                ...variation.positions.slice(0, variation.index)
            ]
            : game.positions.slice(0, currentPly + 1)
    ), [ game.positions, currentPly, variation ]);

    const openingWithHistory = useMemo(() => {
        if (opening.name) return opening;

        for (let index = linePositions.length - 1; index >= 0; index--) {
            const name = getOpeningName(linePositions[index].fen);
            if (!name) continue;

            return {
                ...opening,
                name,
                eco: getOpeningEco(name),
                lastKnown: true
            };
        }

        return opening;
    }, [ opening, linePositions ]);

    const canGoBack = variation
        ? variation.index > 0 || variation.rootPly > 0
        : currentPly > 0;

    const canGoForward = variation
        ? variation.index < variation.positions.length
        : currentPly < game.positions.length - 1;

    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || analysing) return;

        if (gameOver) {
            setLines([]);
            setLiveEvaluation(getTerminalEvaluation(position.fen));
            return;
        }

        let active = true;

        setLines([]);
        setLiveEvaluation(undefined);

        engine.analyse(position.fen, {
            depth: settings.depth,
            lines: settings.lines,
            hash: settings.hash
        }, {
            onUpdate: next => {
                if (!active) return;

                setLines(next);
                if (next[0]) setLiveEvaluation(next[0].evaluation);
            }
        }).catch(() => {
            if (active) setLiveEvaluation(undefined);
        });

        return () => {
            active = false;
            if (!batchRunning.current) engine.stop();
        };
    }, [ engineRef, position.fen, settings, analysing, gameOver ]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            const target = event.target;
            if (target instanceof HTMLElement) {
                const tag = target.tagName;

                if (tag == "INPUT" || tag == "TEXTAREA" || tag == "SELECT") return;
            }

            if (event.key == "ArrowLeft") {
                event.preventDefault();
                goBack();
            }

            if (event.key == "ArrowRight") {
                event.preventDefault();
                goForward();
            }

            if (event.key == "Home") {
                event.preventDefault();
                goStart();
            }

            if (event.key == "End") {
                event.preventDefault();
                goEnd();
            }
        }

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [ game.positions.length, currentPly, variation ]);

    useEffect(() => {
        return () => {
            playbackRun.current++;

            if (playbackTimer.current != undefined) {
                window.clearTimeout(playbackTimer.current);
            }
        };
    }, []);

    function handleImport(pgn: string) {
        stopPlayback();

        let next: GameData;

        try {
            next = parsePgn(pgn);
        } catch (parseError) {
            return parseError instanceof Error
                ? parseError.message
                : "Could not read that PGN";
        }

        resetAnalysis();

        setVariation(undefined);
        setGame(next);
        setCurrentPly(0);
        setShowImport(false);

        return;
    }

    function selectPly(ply: number) {
        stopPlayback();
        setVariation(undefined);
        setCurrentPly(Math.max(0, Math.min(game.positions.length - 1, ply)));
    }

    function goBack() {
        stopPlayback();

        if (variation && variation.index > 0) {
            setVariation({ ...variation, index: variation.index - 1 });
            return;
        }

        const rootPly = variation?.rootPly ?? currentPly;

        setVariation(undefined);
        setCurrentPly(Math.max(0, rootPly - 1));
    }

    function goForward() {
        stopPlayback();

        if (variation) {
            if (variation.index < variation.positions.length) {
                setVariation({ ...variation, index: variation.index + 1 });
            }

            return;
        }

        setCurrentPly(ply => Math.min(game.positions.length - 1, ply + 1));
    }

    function goStart() {
        stopPlayback();
        setVariation(undefined);
        setCurrentPly(0);
    }

    function goEnd() {
        stopPlayback();

        if (variation) {
            setVariation({ ...variation, index: variation.positions.length });
            return;
        }

        setCurrentPly(game.positions.length - 1);
    }

    function toPosition(move: Move): Position {
        return {
            fen: move.after,
            san: move.san,
            uci: toUci(move),
            from: move.from as Square,
            to: move.to as Square,
            moveNumber: Number(move.before.split(" ")[5]) || 1,
            colour: move.color
        };
    }

    function appendMove(move: Move) {
        const next = toPosition(move);

        setVariation(current => {
            if (!current) {
                return { rootPly: currentPly, positions: [ next ], index: 1 };
            }

            const positions = [
                ...current.positions.slice(0, current.index),
                next
            ];

            return { ...current, positions, index: positions.length };
        });
    }

    function playMove(move: Move) {
        stopPlayback();
        playMoveSound(move);
        appendMove(move);
    }

    function playEngineLine(line: EngineLine) {
        const move = parseUci(position.fen, line.uciMoves[0]);
        if (move) playMove(move);
    }

    function playBookMove(san: string) {
        try {
            const board = new Chess(position.fen);
            playMove(board.move(san));
        } catch {
            return;
        }
    }

    function stopPlayback() {
        playbackRun.current++;

        if (playbackTimer.current != undefined) {
            window.clearTimeout(playbackTimer.current);
            playbackTimer.current = undefined;
        }
    }

    function playLine(startPly: number | undefined, moves: string[]) {
        if (!moves.length) return;

        stopPlayback();

        const normalise = (move: string) => move.replace(/[+#]$/, "");
        const last = game.positions.length - 1;
        const requested = startPly != undefined
            && Number.isInteger(startPly)
            && startPly >= 0
            && startPly <= last
            ? startPly
            : undefined;
        let rootPly = requested ?? variation?.rootPly ?? currentPly;
        let basePositions = requested == undefined && variation
            ? variation.positions.slice(0, variation.index)
            : [];
        const startFen = requested != undefined
            ? game.positions[requested].fen
            : position.fen;

        function buildLine(fen: string) {
            const board = new Chess(fen);
            const built: Move[] = [];

            for (const san of moves) {
                try {
                    built.push(board.move(san));
                } catch {
                    return;
                }
            }

            return built;
        }

        function findMainline() {
            const target = moves.map(normalise);
            let best = -1;
            let bestDistance = Infinity;
            let bestLine: Move[] | undefined;

            for (let start = 0; start <= last - moves.length; start++) {
                const matches = target.every((move, index) => (
                    normalise(game.positions[start + 1 + index].san ?? "") == move
                ));

                if (!matches) continue;

                const line = buildLine(game.positions[start].fen);
                if (!line) continue;

                const distance = Math.abs(start - currentPly);
                if (distance >= bestDistance) continue;

                best = start;
                bestDistance = distance;
                bestLine = line;
            }

            return bestLine ? { root: best, line: bestLine } : undefined;
        }

        let built = requested != undefined ? buildLine(startFen) : undefined;

        if (!built && variation) {
            built = buildLine(position.fen);

            if (built) {
                rootPly = variation.rootPly;
                basePositions = variation.positions.slice(0, variation.index);
            }
        }

        if (!built) {
            const found = findMainline();

            if (found) {
                rootPly = found.root;
                basePositions = [];
                built = found.line;
            }
        }

        if (!built) {
            built = buildLine(position.fen);
            if (built) rootPly = variation?.rootPly ?? currentPly;
        }

        if (!built) {
            const first = normalise(moves[0]);

            for (let index = 1; index <= last; index++) {
                if (normalise(game.positions[index].san ?? "") != first) continue;

                rootPly = index - 1;
                basePositions = [];
                built = buildLine(game.positions[rootPly].fen);
                if (built) break;
            }
        }

        if (!built) return;

        const entries = built.map(move => ({
            move,
            position: toPosition(move)
        }));
        const allPositions = [
            ...basePositions,
            ...entries.map(entry => entry.position)
        ];
        const startIndex = basePositions.length;

        setCurrentPly(rootPly);
        setVariation({
            rootPly,
            positions: allPositions,
            index: startIndex
        });

        const run = ++playbackRun.current;

        function step(index: number) {
            if (run != playbackRun.current) return;
            if (index >= allPositions.length) return;

            const entry = entries[index - startIndex];
            if (entry) playMoveSound(entry.move);

            setVariation(current => current
                ? { ...current, index: index + 1 }
                : current
            );

            playbackTimer.current = window.setTimeout(() => step(index + 1), 1000);
        }

        playbackTimer.current = window.setTimeout(() => step(startIndex), 350);
    }

    return <>
        <FloatingCat/>

        <div className={styles.appShell}>
            <SiteHeader compact variant="dark"/>

            <div className={styles.app}>
            <main className={styles.boardColumn}>
                <BoardArea
                    position={position}
                    white={players.white}
                    black={players.black}
                    flipped={flipped}
                    evaluation={evaluation}
                    classification={currentClassification}
                    size={boardSize}
                    onMove={playMove}
                />
            </main>

            <div className={styles.panelColumn} style={{ height: boardSize }}>
                <AnalysisPanel
                    game={game}
                    currentPly={currentPly}
                    lines={lines}
                    settings={settings}
                    classifications={classifications}
                    analysing={analysing}
                    progress={progress}
                    error={error}
                    opening={openingWithHistory}
                    gameOver={gameOver}
                    variationMoves={variation?.positions
                        .slice(0, variation.index)
                        .map(item => item.san ?? "") ?? []}
                    variationDepth={variation?.index}
                    onImport={() => setShowImport(true)}
                    onSettings={() => setShowSettings(true)}
                    onFlip={() => setFlipped(value => !value)}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onBack={goBack}
                    onForward={goForward}
                    onStart={goStart}
                    onEnd={goEnd}
                    onSelectPly={selectPly}
                    onPlayBookMove={playBookMove}
                    onPlayLine={playEngineLine}
                    onExitVariation={() => setVariation(undefined)}
                    onAnalyseGame={analyseGame}
                    onStopAnalysis={stopAnalysis}
                />
            </div>

            <div className={styles.coachColumn} style={{ height: boardSize }}>
                <CoachPanel
                    game={game}
                    currentPly={currentPly}
                    position={position}
                    history={history}
                    isVariation={!!variation}
                    classifications={classifications}
                    evaluations={storedEvaluations}
                    bestMoves={bestMoves}
                    opening={openingWithHistory}
                    settings={settings}
                    analysing={analysing}
                    progress={progress}
                    onAnalyseGame={analyseGame}
                    onStopAnalysis={stopAnalysis}
                    onPlayLine={playLine}
                />
            </div>

            {showSettings && <SettingsDialog
                settings={settings}
                onChange={setSettings}
                onClose={() => setShowSettings(false)}
            />}

            {showImport && <ImportDialog
                onImport={handleImport}
                onClose={() => setShowImport(false)}
            />}
            </div>
        </div>
    </>;
}

export default App;
