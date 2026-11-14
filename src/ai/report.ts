import { Chess } from "chess.js";

import { ChatClient, ChatMessage, CoachMode, Usage } from "./types";
import {
    buildBriefReportPrompt, buildFullReportPrompt, buildKeyReportPrompt,
    buildReportSystem
} from "./prompt";
import { formatEvaluation } from "../lib/evaluation";
import { getOpeningContext, getOpeningName } from "../lib/openings";
import { getMaterial, getThreats } from "./threats";
import { getMoveDetails } from "./move";
import { findUnknownReportMoves, getKnownReportMoves } from "./validateReport";
import { GameData, MoveClassification, Evaluation, Position } from "../types";

interface ReportOptions {
    game: GameData;
    classifications: (MoveClassification | undefined)[];
    evaluations: (Evaluation | undefined)[];
    bestMoves: (string | undefined)[];
}

function moveLabel(position: Position) {
    return `${position.moveNumber}${position.colour == "w" ? "." : "..."} ${position.san}`;
}

function getHistory(game: GameData, ply: number) {
    return game.positions
        .slice(1, ply + 1)
        .map(position => position.uci)
        .filter((uci): uci is string => !!uci);
}

function headerFacts(game: GameData) {
    const headers = game.headers;
    const white = headers.White || "White";
    const black = headers.Black || "Black";
    const whiteElo = headers.WhiteElo ? ` (${headers.WhiteElo})` : "";
    const blackElo = headers.BlackElo ? ` (${headers.BlackElo})` : "";

    return `${white}${whiteElo} vs ${black}${blackElo}, result ${headers.Result || "*"}, ${headers.Event || "imported game"}`;
}

function openingFacts(game: GameData) {
    const last = game.positions.length - 1;
    let name: string | undefined;
    let ply = 0;

    for (let index = Math.min(12, last); index >= 0; index--) {
        const found = getOpeningName(game.positions[index].fen);
        if (found) {
            name = found;
            ply = index;
            break;
        }
    }

    if (!name) return "Opening: unknown";

    const opening = getOpeningContext(
        game.positions[ply].fen,
        getHistory(game, ply)
    );
    const line = game.positions
        .slice(1, ply + 1)
        .map(position => (
            `${position.moveNumber}${position.colour == "w" ? "." : "..."} ${position.san}`
        ))
        .join(" ");
    const stats = opening.stats
        ? `, ${opening.stats.games} games, White ${Math.round(opening.stats.whiteWin * 100)}%, draw ${Math.round(opening.stats.draw * 100)}%, Black ${Math.round(opening.stats.blackWin * 100)}%`
        : "";

    return `Opening: ${name}${opening.eco ? ` (${opening.eco})` : ""}${stats}. Line: ${line}`;
}

function evaluationSwing(before?: Evaluation, after?: Evaluation) {
    if (!before || !after) return 0;

    if (before.type == "mate" || after.type == "mate") return 1000;

    return Math.abs(after.value - before.value);
}

function moveFacts(
    options: ReportOptions, ply: number, detailed: boolean
) {
    const position = options.game.positions[ply];
    const classification = options.classifications[ply];
    const before = options.evaluations[ply - 1];
    const after = options.evaluations[ply];
    const best = options.bestMoves[ply - 1];
    const details = getMoveDetails(options.game, ply);
    const material = getMaterial(position.fen);
    const parts = [
        moveLabel(position),
        classification?.classification ?? "unclassified",
        `${formatEvaluation(before)} -> ${formatEvaluation(after)}`,
        `replayFrom ${Math.max(0, ply - 1)}`,
        `material ${material.white}-${material.black}`
    ];

    if (details?.captured) parts.push(`captured ${details.captured}`);

    if (details) {
        parts.push(`${details.piece} ${details.from}-${details.to}`);
    }

    const isBook = classification?.classification == "book";

    if (isBook) {
        parts.push("theory, not a mistake");
    } else if (best && best != position.san) {
        parts.push(`best ${best}`);
    }

    const showThreats = classification?.classification == "mistake"
        || classification?.classification == "blunder";

    if (detailed && !isBook && showThreats) {
        const board = new Chess(position.fen);

        if (!board.isGameOver()) {
            const threats = getThreats(position.fen);
            const hanging = threats.hanging
                .slice(0, 2)
                .map(piece => `${piece.piece} on ${piece.square}`);

            if (hanging.length) parts.push(`loose: ${hanging.join(", ")}`);
            if (threats.captures.length) {
                parts.push(`capture threat: ${threats.captures[0].san}`);
            }
        }
    }

    return parts.join(" | ");
}

function getKeyPlies(options: ReportOptions) {
    const scored: { ply: number; score: number }[] = [];
    const important = new Set([ "blunder", "mistake", "great", "brilliant" ]);
    const last = options.game.positions.length - 1;

    for (let ply = 1; ply <= last; ply++) {
        const position = options.game.positions[ply];
        const classification = options.classifications[ply]?.classification;
        const swing = evaluationSwing(
            options.evaluations[ply - 1],
            options.evaluations[ply]
        );

        if (ply == last || position.san?.endsWith("#")) {
            scored.push({ ply, score: 2000 + swing });
        }

        if (!classification || !important.has(classification)) continue;

        const weight = classification == "blunder"
            ? 1000
            : classification == "mistake"
                ? 600
                : classification == "brilliant"
                    ? 500
                    : 400;

        scored.push({ ply, score: weight + swing });
    }

    const selected = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(item => item.ply);

    if (last > 0 && !selected.includes(last)) selected.push(last);

    return [ ...new Set(selected) ].sort((a, b) => a - b);
}

function buildFacts(options: ReportOptions, plies: number[], detailed: boolean) {
    const lines = [
        headerFacts(options.game),
        openingFacts(options.game),
        "Book moves are theory. A small Stockfish preference is not a mistake."
    ];

    if (detailed && plies.length) {
        let turningPly = plies[0];
        let turningScore = -1;

        for (const ply of plies) {
            const score = evaluationSwing(
                options.evaluations[ply - 1],
                options.evaluations[ply]
            );

            if (score > turningScore) {
                turningScore = score;
                turningPly = ply;
            }
        }

        lines.push(
            `Turning point: ${moveLabel(options.game.positions[turningPly])} `
            + `(${formatEvaluation(options.evaluations[turningPly - 1])} -> `
            + `${formatEvaluation(options.evaluations[turningPly])})`
        );
    }

    lines.push(
        "",
        "Moves:",
        ...plies.map(ply => moveFacts(options, ply, detailed))
    );

    return lines.join("\n");
}

function allPlies(options: ReportOptions) {
    return Array.from(
        { length: options.game.positions.length - 1 },
        (_, index) => index + 1
    );
}

async function complete(
    client: ChatClient, system: string, prompt: string, signal?: AbortSignal
) {
    const messages: ChatMessage[] = [
        { role: "system", content: system },
        { role: "user", content: prompt }
    ];

    const completion = await client.complete(
        messages,
        [],
        signal,
        { thinking: false, temperature: 0.2 }
    );

    return {
        content: completion.content.trim(),
        usage: completion.usage
    };
}

async function completeChecked(
    client: ChatClient,
    system: string,
    prompt: string,
    known: Set<string>,
    signal?: AbortSignal,
    onUsage?: (usage?: Usage) => void
) {
    const first = await complete(client, system, prompt, signal);
    onUsage?.(first.usage);

    const unknown = findUnknownReportMoves(first.content, known);
    if (!unknown.length) return first.content;

    const repairPrompt = `${prompt}

Your previous draft used these moves, which are not in the facts: ${unknown.join(", ")}.
Rewrite the section using only moves that appear in the facts. Do not mention any other move.`;

    const repaired = await complete(client, system, repairPrompt, signal);
    onUsage?.(repaired.usage);

    return repaired.content;
}

export async function generateReport(
    mode: CoachMode,
    options: ReportOptions,
    client: ChatClient,
    onProgress?: (label: string) => void,
    onUsage?: (usage?: Usage) => void,
    signal?: AbortSignal
) {
    if (mode == "manual") return "";

    const system = buildReportSystem();
    const known = getKnownReportMoves(options.game, options.bestMoves);

    if (mode == "key") {
        onProgress?.("Finding key moments");
        const plies = getKeyPlies(options);
        const facts = buildFacts(options, plies, true)
            + (plies.length ? "" : "\nNo mistakes or turning points were detected.");

        onProgress?.("Writing the report");
        return await completeChecked(
            client,
            system,
            buildKeyReportPrompt(facts),
            known,
            signal,
            onUsage
        );
    }

    if (mode == "brief") {
        const plies = allPlies(options);
        if (!plies.length) return "There are no moves to explain.";

        onProgress?.("Preparing every move");
        const facts = buildFacts(options, plies, false);

        onProgress?.("Writing the report");
        return await completeChecked(
            client,
            system,
            buildBriefReportPrompt(facts),
            known,
            signal,
            onUsage
        );
    }

    const plies = allPlies(options);

    if (!plies.length) return "There are no moves to explain.";

    const chunks: number[][] = [];

    for (let index = 0; index < plies.length; index += 16) {
        chunks.push(plies.slice(index, index + 16));
    }

    const sections: string[] = [];

    for (const [ index, chunk ] of chunks.entries()) {
        const from = chunk[0];
        const to = chunk.at(-1) ?? from;
        const facts = buildFacts(options, chunk, false);

        onProgress?.(`Writing moves ${from}-${to} (${index + 1}/${chunks.length})`);
        sections.push(await completeChecked(
            client,
            system,
            buildFullReportPrompt(facts, from, to),
            known,
            signal,
            onUsage
        ));
    }

    return sections.join("\n\n");
}
