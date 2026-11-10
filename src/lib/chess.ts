import { Chess, Move, PieceSymbol } from "chess.js";
import { Square } from "react-chessboard/dist/chessboard/types";

export function toUci(move: Move) {
    return `${move.from}${move.to}${move.promotion ?? ""}`;
}

export function parseUci(fen: string, uci: string): Move | undefined {
    const board = new Chess(fen);

    try {
        return board.move({
            from: uci.slice(0, 2) as Square,
            to: uci.slice(2, 4) as Square,
            promotion: uci[4] as PieceSymbol | undefined
        });
    } catch {
        return;
    }
}

export function getSanFromUci(fen: string, uci: string) {
    return parseUci(fen, uci)?.san;
}
