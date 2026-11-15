import { Chess } from "chess.js";

import {
    GameData, MoveClassification
} from "../types";
import { detectGameTactics } from "./tactics";

import {
    TrainingGame, TrainingMove, WeaknessContribution
} from "../training/types";

function getPhase(fen: string, ply: number) {
    if (ply <= 16) return "opening";

    const board = new Chess(fen);
    const pieces = board.board()
        .flat()
        .filter(piece => piece && piece.type != "p" && piece.type != "k");

    return pieces.length <= 6 ? "endgame" : "middlegame";
}

function matchesPlayer(name: string | undefined, playerName: string) {
    if (!playerName.trim()) return false;

    return name?.trim().toLowerCase() == playerName.trim().toLowerCase();
}

export function getPlayerColour(
    game: GameData, playerName: string
): "w" | "b" | undefined {
    if (matchesPlayer(game.headers.White, playerName)) return "w";
    if (matchesPlayer(game.headers.Black, playerName)) return "b";
}

export function getTrainingGameId(game: GameData) {
    const headers = game.headers;
    const last = game.positions.at(-1)?.san ?? "";
    const key = [
        headers.Date,
        headers.White,
        headers.Black,
        game.positions.length,
        last
    ].join("-");

    return key.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function buildTrainingGame(
    game: GameData,
    classifications: (MoveClassification | undefined)[],
    bestMoves: (string | undefined)[],
    playerName: string
) {
    const playerColour = getPlayerColour(game, playerName);
    const contributions: WeaknessContribution[] = [];
    const themes: Record<string, number> = {};
    const moves: TrainingMove[] = [];
    const id = getTrainingGameId(game);
    let mistakes = 0;
    let blunders = 0;

    for (let ply = 1; ply < game.positions.length; ply++) {
        const position = game.positions[ply];
        const classification = classifications[ply];
        const isUser = !playerColour || position.colour == playerColour;

        if (
            isUser
            && classification
            && (classification.classification == "mistake"
                || classification.classification == "blunder")
        ) {
            const weight = classification.classification == "blunder"
                ? 3 + classification.pointLoss * 4
                : 1.5 + classification.pointLoss * 2;
            const beforeFen = game.positions[ply - 1].fen;
            const tactics = detectGameTactics(beforeFen, bestMoves[ply - 1]);
            const phase = getPhase(beforeFen, ply);
            const fallback = phase == "endgame"
                ? "endgameTechnique"
                : phase == "opening" ? "openingGap" : "calculation";
            const detected = tactics.length
                ? tactics
                : [ { id: fallback, evidence: "the best move was missed" } ];
            const moveThemes = [ ...new Set(detected.map(tactic => tactic.id)) ];

            if (classification.classification == "blunder") blunders++;
            else mistakes++;

            for (const tactic of detected) {
                themes[tactic.id] = (themes[tactic.id] ?? 0) + weight;
                contributions.push({
                    theme: tactic.id,
                    weight,
                    example: {
                        gameId: id,
                        ply,
                        san: position.san ?? "",
                        note: tactic.evidence
                    }
                });
            }

            moves.push({
                ply,
                san: position.san ?? "",
                uci: position.uci,
                classification: classification.classification,
                pointLoss: classification.pointLoss,
                themes: moveThemes
            });

            continue;
        }

        moves.push({
            ply,
            san: position.san ?? "",
            uci: position.uci,
            classification: classification?.classification,
            pointLoss: classification?.pointLoss ?? 0,
            themes: []
        });
    }

    const trainingGame: TrainingGame = {
        id,
        recordedAt: Date.now(),
        headers: game.headers,
        playerColour,
        moves,
        themes,
        mistakes,
        blunders
    };

    return { game: trainingGame, contributions };
}

export function getWeakestThemes(
    weaknesses: Record<string, { score: number; occurrences: number }>,
    limit = 5
) {
    return Object.values(weaknesses)
        .sort((a, b) => (
            b.score - a.score
            || b.occurrences - a.occurrences
        ))
        .slice(0, limit);
}

export function getWeaknessScore(
    weaknesses: Record<string, { score: number }>
) {
    return Object.values(weaknesses).reduce(
        (total, weakness) => total + weakness.score,
        0
    );
}
