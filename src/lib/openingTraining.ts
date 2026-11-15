import { Chess } from "chess.js";

import { ImportedGame } from "./gameImport";
import { getOpeningContext, getOpeningName } from "./openings";
import { parsePgn } from "./pgn";
import { OpeningStudy } from "../training/types";

function getResultScore(result: string, colour: "w" | "b") {
    if (result == "1-0") return colour == "w" ? "win" : "loss";
    if (result == "0-1") return colour == "b" ? "win" : "loss";
    return "draw";
}

export function buildOpeningStudies(
    games: ImportedGame[], playerName: string
): OpeningStudy[] {
    const studies = new Map<string, OpeningStudy>();

    for (const imported of games) {
        let game;

        try {
            game = parsePgn(imported.pgn);
        } catch {
            continue;
        }

        const name = playerName.trim().toLowerCase();
        const colour = game.headers.White?.trim().toLowerCase() == name
            ? "w"
            : game.headers.Black?.trim().toLowerCase() == name ? "b" : undefined;

        if (!colour) continue;

        let openingName: string | undefined;
        let openingPly = 0;

        for (let ply = 0; ply < game.positions.length; ply++) {
            const found = getOpeningName(game.positions[ply].fen);
            if (!found) continue;

            openingName = found;
            openingPly = ply;
        }

        if (!openingName) continue;

        const key = `${colour}-${openingName}`;
        const line = game.positions
            .slice(1, Math.min(game.positions.length, Math.max(openingPly + 1, 24)))
            .map(position => position.san ?? "")
            .filter(Boolean);
        const score = getResultScore(game.headers.Result || "*", colour);
        const current = studies.get(key) ?? {
            key,
            name: openingName,
            eco: undefined,
            colour,
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            lastPlayed: 0,
            line,
            learning: false
        };

        current.games++;
        if (score == "win") current.wins++;
        if (score == "draw") current.draws++;
        if (score == "loss") current.losses++;
        current.lastPlayed = Math.max(
            current.lastPlayed,
            Date.parse(imported.date) || Date.now()
        );
        if (!current.line.length) current.line = line;

        studies.set(key, current);
    }

    return [ ...studies.values() ]
        .sort((a, b) => b.games - a.games)
        .slice(0, 12);
}

export function getDeeperStudyLine(
    study: OpeningStudy,
    importedGames: { id: string; pgn: string }[],
    playerName: string
) {
    const name = playerName.trim().toLowerCase();
    let best: string[] = [];

    if (!name) return best;

    for (const imported of importedGames) {
        let game;

        try {
            game = parsePgn(imported.pgn);
        } catch {
            continue;
        }

        const colour = game.headers.White?.trim().toLowerCase() == name
            ? "w"
            : game.headers.Black?.trim().toLowerCase() == name ? "b" : undefined;

        if (colour != study.colour) continue;

        let openingName: string | undefined;

        for (const position of game.positions) {
            const found = getOpeningName(position.fen);
            if (found) openingName = found;
        }

        if (openingName != study.name) continue;

        const line = game.positions
            .slice(1, Math.min(game.positions.length, 30))
            .map(position => position.san ?? "")
            .filter(Boolean);

        if (line.length > best.length) best = line;
    }

    return best;
}

export function getExtendedOpeningLine(line: string[], maxPlies = 30) {
    const board = new Chess();
    const history: string[] = [];
    const moves: string[] = [];

    for (const san of line) {
        try {
            const move = board.move(san);
            history.push(`${move.from}${move.to}${move.promotion ?? ""}`);
        } catch {
            return line;
        }
    }

    while (history.length + line.length < maxPlies) {
        const context = getOpeningContext(board.fen(), history);
        const next = context.bookMoves[0];

        if (!next) break;

        try {
            const move = board.move(next.san);
            moves.push(next.san);
            history.push(`${move.from}${move.to}${move.promotion ?? ""}`);
        } catch {
            break;
        }
    }

    return [ ...line, ...moves ];
}

export function getOpeningWeaknessFacts(
    studies: OpeningStudy[], study: OpeningStudy, line: string[]
) {
    const ranked = studies
        .map(item => ({
            ...item,
            score: item.games
                ? (item.wins + item.draws * 0.5) / item.games
                : 1
        }))
        .sort((a, b) => a.score - b.score || b.games - a.games)
        .slice(0, 6);

    return [
        getOpeningStudyFacts({ ...study, line }),
        "Repertoire by weakest score:",
        ...ranked.map(item => (
            `- ${item.name}: ${item.games} games, `
            + `${Math.round(item.score * 100)}% score, `
            + `${item.wins}W/${item.draws}D/${item.losses}L`
        ))
    ].join("\n");
}

export function getOpeningStudyFacts(study: OpeningStudy) {
    const board = new Chess();
    const history: string[] = [];

    for (const san of study.line) {
        try {
            const move = board.move(san);
            history.push(`${move.from}${move.to}${move.promotion ?? ""}`);
        } catch {
            break;
        }
    }

    const context = getOpeningContext(board.fen(), history);
    const line = study.line
        .map((san, index) => `${Math.floor(index / 2) + 1}${index % 2 ? "..." : "."} ${san}`)
        .join(" ");
    const moves = context.bookMoves.slice(0, 6).map(move => (
        `${move.san}: ${move.games} games, White ${Math.round(move.whiteWin * 100)}%, `
        + `draw ${Math.round(move.draw * 100)}%, Black ${Math.round(move.blackWin * 100)}%`
    ));

    return [
        `Opening: ${study.name}${study.eco ? ` (${study.eco})` : ""}`,
        `Playing as ${study.colour == "w" ? "White" : "Black"}`,
        `Your record: ${study.games} games, ${study.wins} wins, ${study.draws} draws, ${study.losses} losses`,
        `Line: ${line || "(starting position)"}`,
        `FEN: ${board.fen()}`,
        context.stats
            ? `Position database: ${context.stats.games} games, White ${Math.round(context.stats.whiteWin * 100)}%, draw ${Math.round(context.stats.draw * 100)}%, Black ${Math.round(context.stats.blackWin * 100)}%`
            : "Position database: no local statistics",
        "Common book moves:",
        ...(moves.length ? moves : [ "No book continuations found" ])
    ].join("\n");
}

export function getOpeningLineFen(line: string[]) {
    const board = new Chess();

    for (const san of line) {
        try {
            board.move(san);
        } catch {
            break;
        }
    }

    return board.fen();
}

export function getRepertoireScore(studies: OpeningStudy[]) {
    const totals = studies.reduce((result, study) => ({
        games: result.games + study.games,
        wins: result.wins + study.wins,
        draws: result.draws + study.draws,
        losses: result.losses + study.losses
    }), { games: 0, wins: 0, draws: 0, losses: 0 });

    return {
        ...totals,
        score: totals.games
            ? (totals.wins + totals.draws * 0.5) / totals.games
            : 0
    };
}
