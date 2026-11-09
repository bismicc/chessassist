import { useEffect, useRef, useState } from "react";
import { Move } from "chess.js";
import { Square } from "react-chessboard/dist/chessboard/types";

import AnalysisPanel from "./components/AnalysisPanel";
import BoardArea from "./components/BoardArea";
import FloatingCat from "./components/FloatingCat";
import ImportDialog from "./components/ImportDialog";
import SettingsDialog from "./components/SettingsDialog";

import useBoardSize from "./hooks/useBoardSize";
import useEngine from "./hooks/useEngine";

import useSettingsStore from "./stores/SettingsStore";

import { getPlayers, parsePgn, samplePgn } from "./lib/pgn";
import { playMoveSound } from "./lib/sounds";
import { EngineLine, Evaluation, GameData, Position } from "./types";

import * as styles from "./App.module.css";

function App() {
    const [ game, setGame ] = useState<GameData>(() => parsePgn(samplePgn));
    const [ currentPly, setCurrentPly ] = useState(0);
    const [ flipped, setFlipped ] = useState(false);
    const [ lines, setLines ] = useState<EngineLine[]>([]);
    const [ liveEvaluation, setLiveEvaluation ] = useState<Evaluation>();
    const [ storedEvaluations, setStoredEvaluations ] = useState<(Evaluation | undefined)[]>([]);
    const [ analysing, setAnalysing ] = useState(false);
    const [ progress, setProgress ] = useState(0);
    const [ showSettings, setShowSettings ] = useState(false);
    const [ showImport, setShowImport ] = useState(false);
    const [ variation, setVariation ] = useState<Position[]>();

    const { engineRef, error } = useEngine();
    const boardSize = useBoardSize(410);

    const settings = useSettingsStore(state => state.settings);
    const setSettings = useSettingsStore(state => state.setSettings);

    const batchRunning = useRef(false);
    const stopRequested = useRef(false);
    const analysisRun = useRef(0);

    const basePosition = game.positions[Math.min(currentPly, game.positions.length - 1)];
    const position = variation?.at(-1) ?? basePosition;
    const players = getPlayers(game);

    const evaluation = variation
        ? liveEvaluation
        : storedEvaluations[currentPly] ?? liveEvaluation;

    useEffect(() => {
        const engine = engineRef.current;
        if (!engine || analysing) return;

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
    }, [ engineRef, position.fen, settings, analysing ]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            const target = event.target;
            if (target instanceof HTMLElement) {
                const tag = target.tagName;

                if (tag == "INPUT" || tag == "TEXTAREA" || tag == "SELECT") return;
            }

            const lastPly = game.positions.length - 1;

            if (event.key == "ArrowLeft") {
                event.preventDefault();
                setVariation(undefined);
                setCurrentPly(ply => Math.max(0, ply - 1));
            }

            if (event.key == "ArrowRight") {
                event.preventDefault();
                setVariation(undefined);
                setCurrentPly(ply => Math.min(lastPly, ply + 1));
            }

            if (event.key == "Home") {
                event.preventDefault();
                setVariation(undefined);
                setCurrentPly(0);
            }

            if (event.key == "End") {
                event.preventDefault();
                setVariation(undefined);
                setCurrentPly(lastPly);
            }
        }

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [ game.positions.length ]);

    async function analyseGame() {
        const engine = engineRef.current;
        if (!engine || analysing) return;

        const run = ++analysisRun.current;

        batchRunning.current = true;
        stopRequested.current = false;

        setAnalysing(true);
        setProgress(0);

        const evaluations: (Evaluation | undefined)[] = new Array(game.positions.length);
        setStoredEvaluations([ ...evaluations ]);

        for (let ply = 0; ply < game.positions.length; ply++) {
            if (stopRequested.current || run != analysisRun.current) break;

            const engineLines = await engine.analyse(game.positions[ply].fen, {
                depth: settings.depth,
                lines: 1,
                hash: settings.hash
            });

            if (run != analysisRun.current) return;

            evaluations[ply] = engineLines[0]?.evaluation;
            setStoredEvaluations([ ...evaluations ]);
            setProgress(ply + 1);
        }

        batchRunning.current = false;

        if (run != analysisRun.current) return;

        setAnalysing(false);
        setProgress(0);
    }

    function stopGameAnalysis() {
        stopRequested.current = true;
        analysisRun.current++;
        batchRunning.current = false;

        engineRef.current?.stop();
        setAnalysing(false);
        setProgress(0);
    }

    function handleImport(pgn: string) {
        let next: GameData;

        try {
            next = parsePgn(pgn);
        } catch (parseError) {
            return parseError instanceof Error
                ? parseError.message
                : "Could not read that PGN";
        }

        analysisRun.current++;
        stopRequested.current = true;
        batchRunning.current = false;

        engineRef.current?.stop();

        setAnalysing(false);
        setProgress(0);
        setStoredEvaluations([]);
        setVariation(undefined);
        setGame(next);
        setCurrentPly(0);
        setShowImport(false);

        return;
    }

    function selectPly(ply: number) {
        setVariation(undefined);
        setCurrentPly(Math.max(0, Math.min(game.positions.length - 1, ply)));
    }

    function playMove(move: Move) {
        playMoveSound(move);

        const next: Position = {
            fen: move.after,
            san: move.san,
            from: move.from as Square,
            to: move.to as Square,
            moveNumber: Number(move.before.split(" ")[5]) || 1,
            colour: move.color
        };

        setVariation(current => current
            ? [ ...current, next ]
            : [ next ]
        );
    }

    return <>
        <FloatingCat/>

        <div className={styles.app}>
            <main className={styles.boardColumn}>
                <BoardArea
                    position={position}
                    white={players.white}
                    black={players.black}
                    flipped={flipped}
                    evaluation={evaluation}
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
                    analysing={analysing}
                    progress={progress}
                    error={error}
                    variationMoves={variation?.map(item => item.san ?? "") ?? []}
                    onImport={() => setShowImport(true)}
                    onSettings={() => setShowSettings(true)}
                    onFlip={() => setFlipped(value => !value)}
                    onSelectPly={selectPly}
                    onExitVariation={() => setVariation(undefined)}
                    onAnalyseGame={analyseGame}
                    onStopAnalysis={stopGameAnalysis}
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
    </>;
}

export default App;
