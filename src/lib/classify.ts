import { Chess, Move, PieceSymbol, Square } from "chess.js";

import { Evaluation, MoveClassification } from "../types";

const pieceValues: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
};

function getExpectedPoints(evaluation: Evaluation) {
    if (evaluation.type == "mate") {
        return evaluation.value > 0 ? 1 : 0;
    }

    return 1 / (1 + Math.exp(-0.0035 * evaluation.value));
}

function getPointLoss(
    before: Evaluation, after: Evaluation, colour: "w" | "b"
) {
    const white = colour == "w";
    const beforePoints = white
        ? getExpectedPoints(before)
        : 1 - getExpectedPoints(before);
    const afterPoints = white
        ? getExpectedPoints(after)
        : 1 - getExpectedPoints(after);

    return Math.max(0, beforePoints - afterPoints);
}

function getCaptureSquare(move: Move) {
    if (move.isEnPassant()) {
        return `${move.to[0]}${move.from[1]}` as Square;
    }

    return move.to;
}

function isPieceSafe(
    board: Chess, square: Square, type: PieceSymbol, colour: "w" | "b"
) {
    const opponent = colour == "w" ? "b" : "w";
    const attackers = board.attackers(square, opponent);
    const defenders = board.attackers(square, colour);

    if (!attackers.length) return true;

    const lowestAttackerValue = Math.min(...attackers.map(attacker => (
        pieceValues[board.get(attacker)?.type ?? "p"]
    )));

    if (lowestAttackerValue < pieceValues[type]) return false;
    if (attackers.length <= defenders.length) return true;
    if (defenders.some(defender => board.get(defender)?.type == "p")) return true;

    return false;
}

function getLowestAttackerValue(
    board: Chess, square: Square, colour: "w" | "b"
) {
    const opponent = colour == "w" ? "b" : "w";
    const attackers = board.attackers(square, opponent);

    if (!attackers.length) return Infinity;

    return Math.min(...attackers.map(attacker => (
        pieceValues[board.get(attacker)?.type ?? "p"]
    )));
}

export function classifyMove(
    before: Evaluation | undefined,
    after: Evaluation | undefined,
    playedSan: string,
    bestSan: string | undefined,
    colour: "w" | "b"
): MoveClassification | undefined {
    if (!before || !after) return;

    if (playedSan == bestSan) {
        return { classification: "best", pointLoss: 0 };
    }

    const pointLoss = getPointLoss(before, after, colour);

    if (pointLoss < 0.01) return { classification: "best", pointLoss };
    if (pointLoss < 0.12) return { classification: "good", pointLoss };
    if (pointLoss < 0.22) return { classification: "mistake", pointLoss };

    return { classification: "blunder", pointLoss };
}

export function isGreatMove(
    beforeFen: string,
    afterFen: string,
    playedSan: string,
    bestSan: string | undefined,
    secondBestEvaluation: Evaluation | undefined,
    beforeEvaluation: Evaluation | undefined,
    afterEvaluation: Evaluation | undefined,
    colour: "w" | "b"
) {
    if (playedSan != bestSan) return false;
    if (!secondBestEvaluation || !beforeEvaluation || !afterEvaluation) return false;

    const beforeBoard = new Chess(beforeFen);
    if (beforeBoard.isCheck()) return false;

    const move = beforeBoard.move(playedSan);
    if (move.promotion == "q") return false;

    const afterBoard = new Chess(afterFen);
    if (afterBoard.isCheckmate()) return false;

    const opponent = colour == "w" ? "b" : "w";
    const sign = colour == "w" ? 1 : -1;

    if (afterEvaluation.value * sign < 0) return false;
    if (afterEvaluation.type == "mate" && afterEvaluation.value * sign > 0) {
        return false;
    }

    if (secondBestEvaluation.type == "mate") {
        if (secondBestEvaluation.value * sign > 0) return false;
    } else if (secondBestEvaluation.value * sign >= 700) {
        return false;
    }

    const secondBestLoss = getPointLoss(
        beforeEvaluation, secondBestEvaluation, colour
    );

    if (secondBestLoss < 0.1) return false;

    if (move.captured && !isPieceSafe(
        new Chess(beforeFen),
        getCaptureSquare(move),
        move.captured,
        opponent
    )) return false;

    return true;
}

export function isBrilliantMove(
    beforeFen: string,
    afterFen: string,
    playedSan: string,
    bestSan: string | undefined,
    secondBestEvaluation: Evaluation | undefined,
    beforeEvaluation: Evaluation | undefined,
    afterEvaluation: Evaluation | undefined,
    colour: "w" | "b"
) {
    if (playedSan != bestSan) return false;
    if (!secondBestEvaluation || !beforeEvaluation || !afterEvaluation) return false;

    const beforeBoard = new Chess(beforeFen);
    if (beforeBoard.isCheck()) return false;

    const move = beforeBoard.move(playedSan);
    if (move.promotion) return false;

    const afterBoard = new Chess(afterFen);
    if (afterBoard.isCheckmate()) return false;

    const sign = colour == "w" ? 1 : -1;
    const beforeSubjective = beforeEvaluation.value * sign;
    const afterSubjective = afterEvaluation.value * sign;
    const secondSubjective = secondBestEvaluation.value * sign;

    if (beforeEvaluation.type == "mate" && beforeSubjective > 0) return false;
    if (beforeSubjective >= 700) return false;
    if (afterSubjective < 0) return false;
    if (afterEvaluation.type == "centipawn" && afterSubjective >= 700) return false;

    if (secondBestEvaluation.type == "mate") {
        if (secondSubjective > 0) return false;
    } else if (secondSubjective >= 700) {
        return false;
    }

    const movedValue = pieceValues[move.piece];
    const capturedValue = move.captured ? pieceValues[move.captured] : 0;

    if (movedValue < 3) return false;
    if (movedValue <= capturedValue) return false;

    const beforeAttack = getLowestAttackerValue(
        new Chess(beforeFen), move.from, colour
    );

    if (beforeAttack < movedValue) return false;

    const afterAttack = getLowestAttackerValue(
        afterBoard, move.to, colour
    );

    if (afterAttack >= movedValue) return false;

    const captures = afterBoard.moves({ verbose: true }).filter(
        capture => capture.to == move.to
    );

    return captures.length > 0;
}
