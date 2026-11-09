import { Chess } from "chess.js";
import { Square } from "react-chessboard/dist/chessboard/types";

import { GameData, PlayerInfo, Position } from "../types";

export const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const samplePgn = `[Event "Casual Game"]
[Site "Chessasist"]
[Date "2026.11.08"]
[White "NyleTheRiver"]
[Black "E4NC390"]
[Result "1-0"]
[WhiteElo "1867"]
[BlackElo "1831"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0
`;

export function parsePgn(pgn: string): GameData {
    const game = new Chess();
    game.loadPgn(pgn.trim());

    const moves = game.history({ verbose: true });
    if (!moves.length) throw new Error("That PGN does not contain any moves");

    const headers = game.getHeaders();
    const startFen = new Chess(headers.FEN || undefined).fen();

    const positions: Position[] = [
        {
            fen: startFen,
            moveNumber: Number(startFen.split(" ")[5]) || 1,
            colour: startFen.split(" ")[1] == "b" ? "b" : "w"
        }
    ];

    for (const move of moves) {
        positions.push({
            fen: move.after,
            san: move.san,
            from: move.from as Square,
            to: move.to as Square,
            moveNumber: Number(move.before.split(" ")[5]) || 1,
            colour: move.color
        });
    }

    return { headers, positions };
}

export function getPlayers(game: GameData): { white: PlayerInfo; black: PlayerInfo } {
    return {
        white: {
            name: game.headers.White || "White",
            elo: game.headers.WhiteElo
        },
        black: {
            name: game.headers.Black || "Black",
            elo: game.headers.BlackElo
        }
    };
}
