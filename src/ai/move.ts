import { Chess, PieceSymbol } from "chess.js";

import { GameData } from "../types";

export interface MoveDetails {
    san: string;
    from: string;
    to: string;
    piece: PieceSymbol;
    captured?: PieceSymbol;
    colour: "w" | "b";
}

export function getMoveDetails(
    game: GameData, ply: number
): MoveDetails | undefined {
    if (ply <= 0 || ply >= game.positions.length) return;

    const before = game.positions[ply - 1];
    const position = game.positions[ply];

    if (!position.san) return;

    try {
        const board = new Chess(before.fen);
        const move = board.move(position.san);

        return {
            san: move.san,
            from: move.from,
            to: move.to,
            piece: move.piece,
            captured: move.captured,
            colour: move.color
        };
    } catch {
        return;
    }
}
