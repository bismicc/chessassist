import { Classification } from "../types";

export interface TrainingMove {
    ply: number;
    san: string;
    uci?: string;
    classification?: Classification;
    pointLoss: number;
    themes: string[];
}

export interface TrainingGame {
    id: string;
    recordedAt: number;
    headers: Record<string, string>;
    playerColour?: "w" | "b";
    moves: TrainingMove[];
    themes: Record<string, number>;
    mistakes: number;
    blunders: number;
}

export interface WeaknessExample {
    gameId: string;
    ply: number;
    san: string;
    note: string;
}

export interface WeaknessRecord {
    theme: string;
    score: number;
    occurrences: number;
    lastSeen: number;
    examples: WeaknessExample[];
}

export interface WeaknessContribution {
    theme: string;
    weight: number;
    example: WeaknessExample;
}

export interface PuzzleProgress {
    id: string;
    theme: string;
    rating: number;
    attempts: number;
    successes: number;
    streak: number;
    due: number;
    lastSeen: number;
}

export interface PuzzleResult {
    puzzleId: string;
    theme: string;
    rating: number;
    success: boolean;
}

export interface ImportedGameRecord {
    id: string;
    pgn: string;
}

export interface OpeningStudy {
    key: string;
    name: string;
    eco?: string;
    colour: "w" | "b";
    games: number;
    wins: number;
    draws: number;
    losses: number;
    lastPlayed: number;
    line: string[];
    learning: boolean;
}

export interface PuzzlePackItem {
    id: string;
    fen: string;
    moves: string[];
    rating: number;
    themes: string[];
    popularity: number;
    plays: number;
    url: string;
    opening: string;
}
