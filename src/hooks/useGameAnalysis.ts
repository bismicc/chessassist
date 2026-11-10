import { useRef, useState } from "react";
import { Chess } from "chess.js";

import Engine from "../lib/engine";
import { getSanFromUci } from "../lib/chess";
import { classifyMove, isBrilliantMove, isGreatMove } from "../lib/classify";
import { getTerminalEvaluation } from "../lib/evaluation";
import { isBookHistory, isBookPosition } from "../lib/openings";

import {
    EngineLine, EngineSettings, Evaluation, MoveClassification, Position
} from "../types";

interface GameAnalysisOptions {
    engineRef: { current: Engine | null };
    positions: Position[];
    settings: EngineSettings;
}

export default function useGameAnalysis({
    engineRef, positions, settings
}: GameAnalysisOptions) {
    const [ analysing, setAnalysing ] = useState(false);
    const [ progress, setProgress ] = useState(0);
    const [ storedEvaluations, setStoredEvaluations ] = useState<(Evaluation | undefined)[]>([]);
    const [ classifications, setClassifications ] = useState<(MoveClassification | undefined)[]>([]);

    const batchRunning = useRef(false);
    const stopRequested = useRef(false);
    const analysisRun = useRef(0);

    async function analyseGame() {
        const engine = engineRef.current;
        if (!engine || analysing) return;

        const run = ++analysisRun.current;

        batchRunning.current = true;
        stopRequested.current = false;

        setAnalysing(true);
        setProgress(0);
        setClassifications([]);

        const evaluations: (Evaluation | undefined)[] = new Array(positions.length);
        const secondBestEvaluations: (Evaluation | undefined)[] = new Array(
            positions.length
        );
        const bestMoves: (string | undefined)[] = new Array(positions.length);
        setStoredEvaluations([ ...evaluations ]);

        let failed = false;

        for (let ply = 0; ply < positions.length; ply++) {
            if (stopRequested.current || run != analysisRun.current) break;

            const board = new Chess(positions[ply].fen);

            if (board.isGameOver()) {
                evaluations[ply] = getTerminalEvaluation(positions[ply].fen);
                setStoredEvaluations([ ...evaluations ]);
                setProgress(ply + 1);
                continue;
            }

            let engineLines: EngineLine[];

            try {
                engineLines = await engine.analyse(positions[ply].fen, {
                    depth: settings.depth,
                    lines: Math.max(2, settings.lines),
                    hash: settings.hash,
                    san: false
                });
            } catch {
                failed = true;
                break;
            }

            if (run != analysisRun.current) return;

            evaluations[ply] = engineLines[0]?.evaluation;
            secondBestEvaluations[ply] = engineLines[1]?.evaluation;
            const bestUci = engineLines[0]?.uciMoves[0];
            bestMoves[ply] = bestUci
                ? getSanFromUci(positions[ply].fen, bestUci)
                : undefined;
            setStoredEvaluations([ ...evaluations ]);
            setProgress(ply + 1);
        }

        batchRunning.current = false;

        if (failed || run != analysisRun.current) {
            setAnalysing(false);
            setProgress(0);
            return;
        }

        const classified: (MoveClassification | undefined)[] = new Array(
            positions.length
        );
        const playedHistory: string[] = [];

        for (let ply = 1; ply < positions.length; ply++) {
            const san = positions[ply].san ?? "";
            const afterFen = positions[ply].fen;
            const uci = positions[ply].uci;

            if (uci) playedHistory.push(uci);

            if (isBookPosition(afterFen) || isBookHistory(playedHistory)) {
                classified[ply] = { classification: "book", pointLoss: 0 };
                continue;
            }

            if (san.endsWith("#")) {
                classified[ply] = { classification: "best", pointLoss: 0 };
                continue;
            }

            const classification = classifyMove(
                evaluations[ply - 1],
                evaluations[ply],
                san,
                bestMoves[ply - 1],
                positions[ply].colour
            );

            if (classification?.classification == "best") {
                if (isBrilliantMove(
                    positions[ply - 1].fen,
                    afterFen,
                    san,
                    bestMoves[ply - 1],
                    secondBestEvaluations[ply - 1],
                    evaluations[ply - 1],
                    evaluations[ply],
                    positions[ply].colour
                )) {
                    classified[ply] = {
                        classification: "brilliant",
                        pointLoss: classification.pointLoss
                    };

                    continue;
                }

                if (isGreatMove(
                    positions[ply - 1].fen,
                    afterFen,
                    san,
                    bestMoves[ply - 1],
                    secondBestEvaluations[ply - 1],
                    evaluations[ply - 1],
                    evaluations[ply],
                    positions[ply].colour
                )) {
                    classified[ply] = {
                        classification: "great",
                        pointLoss: classification.pointLoss
                    };

                    continue;
                }
            }

            classified[ply] = classification;
        }

        setClassifications(classified);
        setAnalysing(false);
        setProgress(0);
    }

    function stopAnalysis() {
        stopRequested.current = true;
        analysisRun.current++;
        batchRunning.current = false;

        engineRef.current?.stop();
        setAnalysing(false);
        setProgress(0);
    }

    function resetAnalysis() {
        stopAnalysis();
        setStoredEvaluations([]);
        setClassifications([]);
    }

    return {
        analysing,
        progress,
        storedEvaluations,
        classifications,
        batchRunning,
        analyseGame,
        stopAnalysis,
        resetAnalysis
    };
}
