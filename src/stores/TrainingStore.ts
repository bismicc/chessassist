import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
    ImportedGameRecord, OpeningStudy, PuzzleProgress, PuzzleResult,
    TrainingGame, WeaknessContribution, WeaknessRecord
} from "../training/types";

interface TrainingStore {
    playerName: string;
    games: TrainingGame[];
    weaknesses: Record<string, WeaknessRecord>;
    puzzleProgress: Record<string, PuzzleProgress>;
    puzzleRating: number;
    puzzleAttempts: number;
    puzzleSuccesses: number;
    openings: Record<string, OpeningStudy>;
    importedGames: ImportedGameRecord[];
    importedGameCount: number;
    importedGameSource: "chesscom" | "lichess" | "";
    setPlayerName: (name: string) => void;
    setImportedGames: (
        games: ImportedGameRecord[], source: "chesscom" | "lichess"
    ) => void;
    recordGame: (game: TrainingGame, contributions: WeaknessContribution[]) => void;
    recordPuzzle: (result: PuzzleResult) => void;
    recordOpenings: (studies: OpeningStudy[]) => void;
    replaceOpenings: (studies: OpeningStudy[]) => void;
    setOpeningLearning: (key: string, learning: boolean) => void;
    resetTraining: () => void;
}

const startingPuzzleRating = 1200;

function getExpectedScore(playerRating: number, puzzleRating: number) {
    return 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
}

function getDueInterval(streak: number) {
    const days = [ 0, 1, 3, 7, 16, 35, 60 ];
    return days[Math.min(streak, days.length - 1)] * 24 * 60 * 60 * 1000;
}

const useTrainingStore = create<TrainingStore>()(persist((set, get) => ({
    playerName: "",
    games: [],
    weaknesses: {},
    puzzleProgress: {},
    puzzleRating: startingPuzzleRating,
    puzzleAttempts: 0,
    puzzleSuccesses: 0,
    openings: {},
    importedGames: [],
    importedGameCount: 0,
    importedGameSource: "",

    setPlayerName: name => set({ playerName: name }),

    setImportedGames: (games, source) => set({
        importedGames: games,
        importedGameCount: games.length,
        importedGameSource: source
    }),

    recordGame: (game, contributions) => set(state => {
        if (state.games.some(item => item.id == game.id)) return state;

        const weaknesses = { ...state.weaknesses };

        for (const contribution of contributions) {
            const current = weaknesses[contribution.theme] ?? {
                theme: contribution.theme,
                score: 0,
                occurrences: 0,
                lastSeen: 0,
                examples: []
            };

            weaknesses[contribution.theme] = {
                ...current,
                score: current.score + contribution.weight,
                occurrences: current.occurrences + 1,
                lastSeen: Date.now(),
                examples: [
                    contribution.example,
                    ...current.examples.filter(example => (
                        example.gameId != contribution.example.gameId
                        || example.ply != contribution.example.ply
                    ))
                ].slice(0, 5)
            };
        }

        return {
            games: [ game, ...state.games ].slice(0, 40),
            weaknesses
        };
    }),

    recordPuzzle: result => set(state => {
        const previous = state.puzzleProgress[result.puzzleId];
        const expected = getExpectedScore(state.puzzleRating, result.rating);
        const score = result.success ? 1 : 0;
        const nextRating = Math.round(
            state.puzzleRating + 24 * (score - expected)
        );
        const streak = result.success ? (previous?.streak ?? 0) + 1 : 0;
        const due = Date.now() + (
            result.success ? getDueInterval(streak) : 10 * 60 * 1000
        );

        return {
            puzzleRating: Math.max(400, Math.min(2800, nextRating)),
            puzzleAttempts: state.puzzleAttempts + 1,
            puzzleSuccesses: state.puzzleSuccesses + (result.success ? 1 : 0),
            puzzleProgress: {
                ...state.puzzleProgress,
                [result.puzzleId]: {
                    id: result.puzzleId,
                    theme: result.theme,
                    rating: result.rating,
                    attempts: (previous?.attempts ?? 0) + 1,
                    successes: (previous?.successes ?? 0) + (result.success ? 1 : 0),
                    streak,
                    due,
                    lastSeen: Date.now()
                }
            }
        };
    }),

    recordOpenings: studies => set(state => {
        const openings = { ...state.openings };

        for (const study of studies) {
            const previous = openings[study.key];
            const existing = previous
                ? {
                    ...previous,
                    games: previous.games + study.games,
                    wins: previous.wins + study.wins,
                    draws: previous.draws + study.draws,
                    losses: previous.losses + study.losses,
                    lastPlayed: Math.max(previous.lastPlayed, study.lastPlayed),
                    line: study.line.length ? study.line : previous.line
                }
                : study;

            openings[study.key] = existing;
        }

        return { openings };
    }),

    replaceOpenings: studies => set({
        openings: Object.fromEntries(studies.map(study => [ study.key, study ]))
    }),

    setOpeningLearning: (key, learning) => set(state => {
        const opening = state.openings[key];
        if (!opening) return state;

        return {
            openings: {
                ...state.openings,
                [key]: { ...opening, learning }
            }
        };
    }),

    resetTraining: () => set({
        playerName: get().playerName,
        games: [],
        weaknesses: {},
        puzzleProgress: {},
        puzzleRating: startingPuzzleRating,
        puzzleAttempts: 0,
        puzzleSuccesses: 0,
        openings: {},
        importedGames: [],
        importedGameCount: 0,
        importedGameSource: ""
    })
}), {
    name: "chessassist.training"
}));

export default useTrainingStore;
