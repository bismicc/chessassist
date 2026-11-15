import { Chess } from "chess.js";

import { detectMoveTactics } from "./tactics";
import {
    PuzzlePackItem, PuzzleProgress, WeaknessRecord
} from "../training/types";

interface PuzzlePack {
    source: string;
    items: PuzzlePackItem[];
}

const fallbackThemes = [
    "fork", "pin", "backRankMate", "xRayAttack", "discoveredAttack",
    "mateIn2", "skewer", "hangingPiece"
];

export const puzzleThemeFallbacks: Record<string, string[]> = {
    calculation: [ "fork", "pin", "mateIn2", "discoveredAttack" ],
    positionalPlay: [ "quietMove", "defensiveMove", "pawnEndgame" ],
    openingGap: [ "fork", "pin", "discoveredAttack" ],
    endgameTechnique: [ "pawnEndgame", "rookEndgame", "bishopEndgame" ],
    capturingDefender: [ "deflection", "attraction" ],
    oppositionEndgame: [ "pawnEndgame" ],
    keySquares: [ "pawnEndgame" ],
    enPassant: [ "enPassant" ],
    overloading: [ "deflection", "clearance" ]
};

let cache: PuzzlePackItem[] | undefined;
let pending: Promise<PuzzlePackItem[]> | undefined;

export async function loadPuzzles() {
    if (cache) return cache;
    if (pending) return pending;

    pending = fetch("puzzles/puzzles.json")
        .then(response => {
            if (!response.ok) {
                throw new Error(`Could not load puzzles (${response.status})`);
            }

            return response.json() as Promise<PuzzlePack>;
        })
        .then(pack => {
            cache = pack.items;
            return cache;
        })
        .finally(() => {
            pending = undefined;
        });

    return pending;
}

export function getPuzzleThemes(theme: string) {
    return puzzleThemeFallbacks[theme] ?? [ theme ];
}

export function applyPuzzleSetup(puzzle: PuzzlePackItem) {
    const board = new Chess(puzzle.fen);
    const setup = puzzle.moves[0];

    try {
        board.move({
            from: setup.slice(0, 2),
            to: setup.slice(2, 4),
            promotion: setup[4]
        });
    } catch {
        return;
    }

    return {
        fen: board.fen(),
        solution: puzzle.moves.slice(1),
        orientation: board.turn() == "w" ? "white" as const : "black" as const
    };
}

export function getDuePuzzleIds(progress: Record<string, PuzzleProgress>) {
    const now = Date.now();

    return Object.values(progress)
        .filter(item => item.due <= now)
        .sort((a, b) => a.due - b.due)
        .map(item => item.id);
}

export function getDuePuzzleCount(progress: Record<string, PuzzleProgress>) {
    return Object.values(progress).filter(item => item.due <= Date.now()).length;
}

function ratingDistance(item: PuzzlePackItem, rating: number) {
    return Math.abs(item.rating - rating);
}

function isRecent(progress: PuzzleProgress | undefined) {
    if (!progress) return false;

    return Date.now() - progress.lastSeen < 3 * 24 * 60 * 60 * 1000;
}

function chooseTheme(
    weaknesses: Record<string, WeaknessRecord>, preferredTheme?: string
) {
    if (preferredTheme && preferredTheme != "all") {
        return getPuzzleThemes(preferredTheme);
    }

    const themes = Object.values(weaknesses)
        .sort((a, b) => b.score - a.score)
        .flatMap(weakness => getPuzzleThemes(weakness.theme));

    return themes.length ? [ ...new Set(themes) ] : fallbackThemes;
}

export function selectPuzzle(
    items: PuzzlePackItem[],
    weaknesses: Record<string, WeaknessRecord>,
    progress: Record<string, PuzzleProgress>,
    rating: number,
    preferredTheme?: string,
    dueOnly = false
) {
    const byId = new Map(items.map(item => [ item.id, item ]));
    const due = getDuePuzzleIds(progress)
        .map(id => byId.get(id))
        .filter((item): item is PuzzlePackItem => !!item);

    if (dueOnly) return due[0];

    if (due.length && !preferredTheme) {
        return due[0];
    }

    const themes = chooseTheme(weaknesses, preferredTheme);
    const candidates = items.filter(item => (
        item.themes.some(theme => themes.includes(theme))
    ));

    if (!candidates.length) return items[Math.floor(Math.random() * items.length)];

    const fresh = candidates.filter(item => !isRecent(progress[item.id]));
    const pool = fresh.length ? fresh : candidates;
    const near = pool
        .slice()
        .sort((a, b) => ratingDistance(a, rating) - ratingDistance(b, rating))
        .slice(0, 80);
    const weights = near.map(item => (
        Math.max(1, item.popularity * 2 + Math.min(item.plays, 5000) / 100)
    ));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;

    for (const [ index, item ] of near.entries()) {
        roll -= weights[index];
        if (roll <= 0) return item;
    }

    return near[0] ?? pool[0];
}

export function getPuzzleStats(
    progress: Record<string, PuzzleProgress>
) {
    const items = Object.values(progress);
    const attempts = items.reduce((sum, item) => sum + item.attempts, 0);
    const successes = items.reduce((sum, item) => sum + item.successes, 0);
    const due = items.filter(item => item.due <= Date.now()).length;

    return {
        attempts,
        successes,
        due,
        accuracy: attempts ? successes / attempts : 0,
        themes: [ ...new Set(items.map(item => item.theme)) ]
    };
}

export function detectPuzzlePoint(fen: string) {
    const board = new Chess(fen);
    const tactics = board.moves({ verbose: true }).flatMap(move => (
        detectMoveTactics(fen, move.san)
    ));
    const ids = [ ...new Set(tactics.map(tactic => tactic.id)) ];

    return ids.slice(0, 4);
}
