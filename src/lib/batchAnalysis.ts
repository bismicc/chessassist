import { Chess } from "chess.js";

import Engine from "./engine";
import { getSanFromUci } from "./chess";
import { classifyMove, isBrilliantMove, isGreatMove } from "./classify";
import { getTerminalEvaluation } from "./evaluation";
import { isBookHistory, isBookPosition } from "./openings";

import {
    EngineLine, EngineSettings, Evaluation, MoveClassification, Position
} from "../types";

export interface BatchAnalysisResult {
    classifications: (MoveClassification | undefined)[];
    bestMoves: (string | undefined)[];
}

interface BatchAnalysisOptions {
    full: boolean;
    settings: EngineSettings;
    isCancelled: () => boolean;
    onProgress?: (ply: number, total: number) => void;
}

function getOpeningLimit(positions: Position[]) {
    let lastBookPly = 0;

    for (let ply = 1; ply < positions.length; ply++) {
        if (isBookPosition(positions[ply].fen)) lastBookPly = ply;
    }

    const openingLimit = Math.min(positions.length, 24);

    return Math.min(
        openingLimit,
        Math.max(16, lastBookPly + 2)
    );
}

export async function analyseGameBatch(
    engine: Engine,
    positions: Position[],
    options: BatchAnalysisOptions
): Promise<BatchAnalysisResult | undefined> {
    const { full, settings, isCancelled, onProgress } = options;
    const maxPly = full ? positions.length : getOpeningLimit(positions);
    const evaluations: (Evaluation | undefined)[] = new Array(positions.length);
    const secondBest: (Evaluation | undefined)[] = new Array(positions.length);
    const bestMoves: (string | undefined)[] = new Array(positions.length);

    for (let ply = 0; ply < maxPly; ply++) {
        if (isCancelled()) return;

        const board = new Chess(positions[ply].fen);
        onProgress?.(ply, maxPly);

        if (board.isGameOver()) {
            evaluations[ply] = getTerminalEvaluation(positions[ply].fen);
            continue;
        }

        let lines: EngineLine[];

        try {
            lines = await engine.analyse(positions[ply].fen, {
                depth: settings.depth,
                lines: Math.max(2, settings.lines),
                hash: settings.hash,
                san: false
            });
        } catch {
            throw new Error("Stockfish stopped during the batch");
        }

        if (isCancelled()) return;

        evaluations[ply] = lines[0]?.evaluation;
        secondBest[ply] = lines[1]?.evaluation;

        const bestUci = lines[0]?.uciMoves[0];
        bestMoves[ply] = bestUci
            ? getSanFromUci(positions[ply].fen, bestUci)
            : undefined;
    }

    onProgress?.(maxPly, maxPly);

    const classifications: (MoveClassification | undefined)[] = new Array(
        positions.length
    );
    const playedHistory: string[] = [];

    for (let ply = 1; ply < maxPly; ply++) {
        const san = positions[ply].san ?? "";
        const afterFen = positions[ply].fen;
        const uci = positions[ply].uci;

        if (uci) playedHistory.push(uci);

        if (isBookPosition(afterFen) || isBookHistory(playedHistory)) {
            classifications[ply] = { classification: "book", pointLoss: 0 };
            continue;
        }

        if (san.endsWith("#")) {
            classifications[ply] = { classification: "best", pointLoss: 0 };
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
                secondBest[ply - 1],
                evaluations[ply - 1],
                evaluations[ply],
                positions[ply].colour
            )) {
                classifications[ply] = {
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
                secondBest[ply - 1],
                evaluations[ply - 1],
                evaluations[ply],
                positions[ply].colour
            )) {
                classifications[ply] = {
                    classification: "great",
                    pointLoss: classification.pointLoss
                };

                continue;
            }
        }

        classifications[ply] = classification;
    }

    return { classifications, bestMoves };
}
