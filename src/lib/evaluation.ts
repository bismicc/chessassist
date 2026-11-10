import { Chess } from "chess.js";

import { Evaluation } from "../types";

export function getTerminalEvaluation(fen: string): Evaluation | undefined {
    const board = new Chess(fen);

    if (board.isCheckmate()) {
        return {
            type: "mate",
            value: board.turn() == "w" ? -1 : 1
        };
    }

    if (board.isGameOver()) return { type: "centipawn", value: 0 };
}

export function toWhiteShare(evaluation: Evaluation): number {
    if (evaluation.type == "mate") {
        if (evaluation.value == 0) return 0.5;
        return evaluation.value > 0 ? 1 : 0;
    }

    return 1 / (1 + Math.pow(10, -evaluation.value / 400));
}

export function formatEvaluation(evaluation?: Evaluation): string {
    if (!evaluation) return "-";

    if (evaluation.type == "mate") {
        if (evaluation.value == 0) return "#";
        const prefix = evaluation.value > 0 ? "+" : "-";
        return `${prefix}M${Math.abs(evaluation.value)}`;
    }

    const pawns = evaluation.value / 100;
    const prefix = pawns >= 0 ? "+" : "";
    return `${prefix}${pawns.toFixed(1)}`;
}

export function formatDepth(depth?: number): string {
    return depth ? `Depth ${depth}` : "Thinking";
}
