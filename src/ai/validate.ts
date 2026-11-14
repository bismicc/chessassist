import { Chess } from "chess.js";

import { GameData } from "../types";

const movePattern = /\b(O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

function normalise(move: string) {
    return move.replace(/[+#]$/, "");
}

export function getKnownMoves(
    game: GameData, bestMoves: (string | undefined)[], extraText = ""
) {
    const known = new Set<string>();

    for (const position of game.positions) {
        if (position.san) known.add(normalise(position.san));

        const board = new Chess(position.fen);

        for (const move of board.moves()) {
            known.add(normalise(move));
        }
    }

    for (const move of bestMoves) {
        if (move) known.add(normalise(move));
    }

    for (const match of extraText.matchAll(movePattern)) {
        known.add(normalise(match[0]));
    }

    return known;
}

export function findUnverifiedMoves(text: string, known: Set<string>) {
    const found = new Set<string>();

    for (const match of text.matchAll(movePattern)) {
        const raw = match[0];

        // Quiet piece moves are too easy to confuse with square names
        if (!raw.startsWith("O-O") && !/[x+#=]/.test(raw)) continue;

        const move = normalise(raw);

        if (!known.has(move)) found.add(move);
    }

    return [ ...found ];
}
