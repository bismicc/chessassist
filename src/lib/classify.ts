import { Evaluation, MoveClassification } from "../types";

function getExpectedPoints(evaluation: Evaluation) {
    if (evaluation.type == "mate") {
        return evaluation.value > 0 ? 1 : 0;
    }

    return 1 / (1 + Math.exp(-0.0035 * evaluation.value));
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

    const white = colour == "w";
    const beforePoints = white
        ? getExpectedPoints(before)
        : 1 - getExpectedPoints(before);
    const afterPoints = white
        ? getExpectedPoints(after)
        : 1 - getExpectedPoints(after);

    const pointLoss = Math.max(0, beforePoints - afterPoints);

    if (pointLoss < 0.01) return { classification: "best", pointLoss };
    if (pointLoss < 0.12) return { classification: "good", pointLoss };
    if (pointLoss < 0.22) return { classification: "mistake", pointLoss };

    return { classification: "blunder", pointLoss };
}
