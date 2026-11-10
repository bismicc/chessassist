import { Chess } from "chess.js";

import openings from "../resources/openings.json";
import openingLines from "../resources/openingsStats.json";

const openingNames = openings as Record<string, string>;

type OpeningLine = [
    string, string, string, number, number, number, number, number
];

interface StatsNode {
    games: number;
    whiteWins: number;
    blackWins: number;
    draws: number;
    ratingSum: number;
    children: Map<string, StatsNode>;
}

export interface OpeningStats {
    games: number;
    whiteWin: number;
    blackWin: number;
    draw: number;
    avgRating: number;
}

export interface OpeningMove {
    san: string;
    uci: string;
    games: number;
    whiteWin: number;
    blackWin: number;
    draw: number;
    avgRating: number;
    name?: string;
    eco?: string;
}

export interface OpeningContext {
    name?: string;
    eco?: string;
    fen: string;
    stats?: OpeningStats;
    bookMoves: OpeningMove[];
    lastKnown?: boolean;
}

const lines = openingLines as OpeningLine[];
const nameToEco = new Map<string, string>();
const statsRoot: StatsNode = {
    games: 0,
    whiteWins: 0,
    blackWins: 0,
    draws: 0,
    ratingSum: 0,
    children: new Map()
};

for (const [
    eco, opening, moves, games, whiteWinRate, drawRate, blackWinRate, avgRating
] of lines) {
    nameToEco.set(opening, eco);

    let node = statsRoot;

    for (const uci of moves.split(" ")) {
        let child = node.children.get(uci);

        if (!child) {
            child = {
                games: 0,
                whiteWins: 0,
                blackWins: 0,
                draws: 0,
                ratingSum: 0,
                children: new Map()
            };

            node.children.set(uci, child);
        }

        child.games += games;
        child.whiteWins += games * whiteWinRate;
        child.blackWins += games * blackWinRate;
        child.draws += games * drawRate;
        child.ratingSum += games * avgRating;
        node = child;
    }
}

for (const child of statsRoot.children.values()) {
    statsRoot.games += child.games;
    statsRoot.whiteWins += child.whiteWins;
    statsRoot.blackWins += child.blackWins;
    statsRoot.draws += child.draws;
    statsRoot.ratingSum += child.ratingSum;
}

function toStats(node: StatsNode | undefined): OpeningStats | undefined {
    if (!node?.games) return;

    return {
        games: node.games,
        whiteWin: node.whiteWins / node.games,
        blackWin: node.blackWins / node.games,
        draw: node.draws / node.games,
        avgRating: node.ratingSum / node.games
    };
}

function getStatsNode(history: string[]) {
    let node: StatsNode | undefined = statsRoot;

    for (const uci of history) {
        node = node?.children.get(uci);
        if (!node) return;
    }

    return node;
}

export function getPositionKey(fen: string) {
    return fen.split(" ")[0];
}

export function isBookPosition(fen: string) {
    return !!openingNames[getPositionKey(fen)];
}

export function isBookHistory(history: string[]) {
    return !!getStatsNode(history)?.games;
}

export function getOpeningName(fen: string) {
    return openingNames[getPositionKey(fen)];
}

export function getOpeningEco(name: string) {
    return nameToEco.get(name);
}

export function getOpeningContext(
    fen: string, history: string[]
): OpeningContext {
    const board = new Chess(fen);
    const name = getOpeningName(fen);
    const node = getStatsNode(history);
    const bookMoves: OpeningMove[] = [];

    for (const move of board.moves({ verbose: true })) {
        const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
        const child = node?.children.get(uci);
        const moveName = openingNames[getPositionKey(move.after)];

        if (!child && !moveName) continue;

        bookMoves.push({
            san: move.san,
            uci,
            games: child?.games ?? 0,
            whiteWin: child?.games ? child.whiteWins / child.games : 0,
            blackWin: child?.games ? child.blackWins / child.games : 0,
            draw: child?.games ? child.draws / child.games : 0,
            avgRating: child?.games ? child.ratingSum / child.games : 0,
            name: moveName,
            eco: moveName ? nameToEco.get(moveName) : undefined
        });
    }

    bookMoves.sort((a, b) => b.games - a.games);

    return {
        name,
        eco: name ? nameToEco.get(name) : undefined,
        fen,
        stats: toStats(node),
        bookMoves
    };
}
