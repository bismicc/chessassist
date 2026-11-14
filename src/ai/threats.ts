import { Chess, PieceSymbol } from "chess.js";

const values: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
};

export interface HangingPiece {
    square: string;
    piece: string;
    attackers: number;
    defenders: number;
    value: number;
}

export interface CaptureThreat {
    san: string;
    from: string;
    to: string;
    captured: string;
    profit: number;
}

export interface ThreatReport {
    turn: "w" | "b";
    inCheck: boolean;
    hanging: HangingPiece[];
    captures: CaptureThreat[];
    checks: string[];
    mates: string[];
    expectedLine?: string[];
    expectedReply?: string;
}

function pieceName(type: PieceSymbol) {
    return {
        p: "pawn",
        n: "knight",
        b: "bishop",
        r: "rook",
        q: "queen",
        k: "king"
    }[type];
}

export function flipTurn(fen: string) {
    const parts = fen.split(" ");

    parts[1] = parts[1] == "w" ? "b" : "w";
    parts[3] = "-";

    return parts.join(" ");
}

export function getMaterial(fen: string) {
    const board = new Chess(fen);
    let white = 0;
    let black = 0;

    for (const row of board.board()) {
        for (const piece of row) {
            if (!piece || piece.type == "k") continue;

            if (piece.color == "w") {
                white += values[piece.type];
            } else {
                black += values[piece.type];
            }
        }
    }

    return { white, black, difference: white - black };
}

export function describeBoard(fen: string) {
    const board = new Chess(fen);
    const rows = board.board();
    const lines: string[] = [ "  a b c d e f g h" ];

    for (const [ index, row ] of rows.entries()) {
        const rank = 8 - index;
        const squares = row.map(piece => {
            if (!piece) return ".";

            const letter = piece.type == "k" ? "k" : piece.type;
            return piece.color == "w" ? letter.toUpperCase() : letter;
        });

        lines.push(`${rank} ${squares.join(" ")} ${rank}`);
    }

    lines.push("  a b c d e f g h");

    return lines.join("\n");
}

function getHangingPieces(fen: string): HangingPiece[] {
    const board = new Chess(fen);
    const turn = board.turn();
    const opponent = turn == "w" ? "b" : "w";
    const hanging: HangingPiece[] = [];

    for (const row of board.board()) {
        for (const piece of row) {
            if (!piece || piece.color != turn || piece.type == "k") continue;

            const attackers = board.attackers(piece.square, opponent);
            if (!attackers.length) continue;

            const defenders = board.attackers(piece.square, turn);
            const lowestAttacker = Math.min(...attackers.map(square => (
                values[board.get(square)?.type ?? "p"]
            )));

            if (defenders.length && lowestAttacker >= values[piece.type]) continue;

            hanging.push({
                square: piece.square,
                piece: pieceName(piece.type),
                attackers: attackers.length,
                defenders: defenders.length,
                value: values[piece.type]
            });
        }
    }

    return hanging.sort((a, b) => b.value - a.value);
}

function getCaptureThreats(fen: string): CaptureThreat[] {
    const board = new Chess(fen);
    const threats: CaptureThreat[] = [];
    const enemyBoard = new Chess(flipTurn(fen));

    for (const move of enemyBoard.moves({ verbose: true })) {
        if (!move.captured) continue;

        const target = board.get(move.to);
        const defenders = board.attackers(move.to, board.turn());
        const lowestAttacker = values[move.piece];
        const capturedValue = values[target?.type ?? move.captured];
        const profit = defenders.length
            ? capturedValue - lowestAttacker
            : capturedValue;

        if (profit <= 0) continue;

        threats.push({
            san: move.san,
            from: move.from,
            to: move.to,
            captured: pieceName(target?.type ?? move.captured),
            profit
        });
    }

    return threats.sort((a, b) => b.profit - a.profit);
}

export function getThreats(fen: string): ThreatReport {
    const board = new Chess(fen);
    const enemyBoard = new Chess(flipTurn(fen));
    const checks: string[] = [];
    const mates: string[] = [];

    for (const move of enemyBoard.moves({ verbose: true })) {
        if (move.san.includes("#")) {
            mates.push(move.san);
            continue;
        }

        if (move.san.includes("+")) checks.push(move.san);
    }

    return {
        turn: board.turn(),
        inCheck: board.isCheck(),
        hanging: getHangingPieces(fen),
        captures: getCaptureThreats(fen),
        checks,
        mates
    };
}
