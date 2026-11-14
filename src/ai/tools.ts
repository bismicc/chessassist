import { Chess } from "chess.js";

import Engine from "../lib/engine";
import { formatEvaluation } from "../lib/evaluation";
import { getOpeningContext, isBookHistory, isBookPosition } from "../lib/openings";
import {
    EngineLine, EngineSettings, Evaluation, GameData, MoveClassification, Position
} from "../types";

import {
    describeBoard, getMaterial, getThreats
} from "./threats";
import { getMoveDetails } from "./move";
import { calculate } from "./calculate";
import {
    ToolCall, ToolResult
} from "./types";

export interface CoachContext {
    game: GameData;
    currentPly: number;
    position: Position;
    history: string[];
    isVariation: boolean;
    classifications: (MoveClassification | undefined)[];
    evaluations: (Evaluation | undefined)[];
    bestMoves: (string | undefined)[];
    settings: EngineSettings;
    engine: Engine;
    lichessToken?: string;
}

interface LichessMove {
    uci: string;
    san: string;
    white: number;
    draws: number;
    black: number;
    averageRating?: number;
}

interface LichessExplorer {
    white: number;
    draws: number;
    black: number;
    moves: LichessMove[];
}

interface TablebaseMove {
    uci: string;
    san: string;
    category: string;
    dtz: number;
    dtm?: number;
}

interface TablebaseResponse {
    category: string;
    dtz?: number;
    dtm?: number;
    moves?: TablebaseMove[];
}

interface CloudEval {
    depth: number;
    knodes: number;
    pvs: {
        moves: string;
        cp?: number;
        mate?: number;
    }[];
}

interface WikipediaSearch {
    query?: {
        search?: {
            title: string;
            snippet: string;
        }[];
    };
}

interface DuckDuckGo {
    Abstract?: string;
    AbstractURL?: string;
    RelatedTopics?: {
        Text?: string;
        FirstURL?: string;
    }[];
}

interface ChessComPlayer {
    username?: string;
    name?: string;
    title?: string;
    country?: string;
    joined?: number;
    last_online?: number;
    followers?: number;
    url?: string;
}

interface LichessUser {
    username?: string;
    title?: string;
    url?: string;
    createdAt?: number;
    seenAt?: number;
    perfs?: Record<string, { rating?: number; games?: number }>;
}

let engineQueue: Promise<unknown> = Promise.resolve();

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function getPosition(context: CoachContext, args: Record<string, unknown>) {
    const requested = Number(args.ply);

    if (!Number.isFinite(requested)) {
        return {
            ply: context.currentPly,
            position: context.position,
            explicit: false
        };
    }

    const ply = clamp(
        Math.round(requested),
        0,
        context.game.positions.length - 1
    );

    return {
        ply,
        position: context.game.positions[ply],
        explicit: true
    };
}

function getHistory(
    context: CoachContext, ply: number, explicit: boolean
) {
    if (!explicit) return context.history;

    return context.game.positions
        .slice(1, ply + 1)
        .map(position => position.uci)
        .filter((uci): uci is string => !!uci);
}

function runEngine(
    context: CoachContext, fen: string, depth: number, lines: number
) {
    const run = engineQueue.then(() => context.engine.analyse(fen, {
        depth,
        lines,
        hash: 32,
        san: true
    }));

    engineQueue = run.catch(() => undefined);

    return run;
}

function formatLine(line: EngineLine, fen: string) {
    const board = new Chess(fen);

    for (const san of line.sanMoves) {
        try {
            board.move(san);
        } catch {
            break;
        }
    }

    return {
        evaluation: formatEvaluation(line.evaluation),
        centipawns: line.evaluation.type == "centipawn"
            ? line.evaluation.value
            : undefined,
        mate: line.evaluation.type == "mate"
            ? line.evaluation.value
            : undefined,
        depth: line.depth,
        san: line.sanMoves,
        uci: line.uciMoves,
        materialAfter: getMaterial(board.fen())
    };
}

function getBoardPayload(
    position: Position, ply: number, game?: GameData
) {
    const board = new Chess(position.fen);
    const material = getMaterial(position.fen);
    const details = game && game.positions[ply]?.fen == position.fen
        ? getMoveDetails(game, ply)
        : undefined;

    return {
        ply,
        fen: position.fen,
        turn: board.turn() == "w" ? "White" : "Black",
        diagram: describeBoard(position.fen),
        inCheck: board.isCheck(),
        gameOver: board.isGameOver(),
        bookPosition: isBookPosition(position.fen),
        material,
        legalMoves: board.moves().slice(0, 60),
        lastMove: details
            ? {
                san: details.san,
                from: details.from,
                to: details.to,
                piece: details.piece,
                captured: details.captured
            }
            : position.san
                ? `${position.moveNumber}${position.colour == "w" ? "." : "..."} ${position.san}`
                : undefined
    };
}

async function inspectPosition(
    context: CoachContext, args: Record<string, unknown>
) {
    const { ply, position, explicit } = getPosition(context, args);
    const board = getBoardPayload(position, ply, context.game);
    const depth = clamp(
        Number(args.depth) || Math.max(16, context.settings.depth),
        8,
        22
    );
    const lines = await runEngine(context, position.fen, depth, 2);
    const threats = getThreats(position.fen);

    if (lines[0]?.sanMoves.length) {
        threats.expectedLine = lines[0].sanMoves.slice(0, 4);
        threats.expectedReply = lines[0].sanMoves[1];
    }

    return {
        board,
        engine: lines.map(line => formatLine(line, position.fen)),
        threats,
        bookPosition: isBookPosition(position.fen),
        bookHistory: isBookHistory(getHistory(context, ply, explicit)),
        opening: summariseOpening(
            position,
            getHistory(context, ply, explicit)
        ),
        classification: explicit ? context.classifications[ply] : undefined
    };
}

async function analysePosition(
    context: CoachContext, args: Record<string, unknown>
) {
    const { ply, position } = getPosition(context, args);
    const depth = clamp(
        Number(args.depth) || Math.max(16, context.settings.depth),
        8,
        22
    );
    const lines = clamp(Number(args.lines) || 2, 1, 3);
    const result = await runEngine(context, position.fen, depth, lines);

    return {
        ply,
        fen: position.fen,
        lines: result.map(line => formatLine(line, position.fen))
    };
}

function summariseOpening(position: Position, history: string[]) {
    const opening = getOpeningContext(position.fen, history);

    return {
        name: opening.name,
        eco: opening.eco,
        lastKnown: opening.lastKnown,
        stats: opening.stats
            ? {
                games: opening.stats.games,
                whiteWin: opening.stats.whiteWin,
                draw: opening.stats.draw,
                blackWin: opening.stats.blackWin,
                averageRating: opening.stats.avgRating
            }
            : undefined,
        bookMoves: opening.bookMoves.slice(0, 8).map(move => ({
            san: move.san,
            games: move.games,
            whiteWin: move.whiteWin,
            draw: move.draw,
            blackWin: move.blackWin,
            averageRating: move.avgRating
        }))
    };
}

async function compareMoves(
    context: CoachContext, args: Record<string, unknown>
) {
    const { ply, position } = getPosition(context, args);
    const moves = Array.isArray(args.moves)
        ? args.moves.filter((move): move is string => typeof move == "string")
        : [];
    const depth = clamp(Number(args.depth) || 16, 8, 20);

    if (!moves.length) throw new Error("Provide at least one SAN move");

    const bestLines = await runEngine(context, position.fen, depth, 1);
    const best = bestLines[0];
    const results = [];

    for (const san of moves.slice(0, 5)) {
        const board = new Chess(position.fen);
        let move;

        try {
            move = board.move(san);
        } catch {
            results.push({ move: san, error: "Illegal move in this position" });
            continue;
        }

        const after = await runEngine(context, move.after, depth, 1);
        const evaluation = after[0]?.evaluation;

        results.push({
            move: san,
            evaluation: formatEvaluation(evaluation),
            bestReply: after[0]?.sanMoves.slice(0, 3),
            isEngineBest: best?.sanMoves[0] == san
        });
    }

    return {
        ply,
        bestMove: best?.sanMoves[0],
        bestLine: best?.sanMoves.slice(0, 5),
        bestEvaluation: formatEvaluation(best?.evaluation),
        results
    };
}

async function inspectMove(
    context: CoachContext, args: Record<string, unknown>
) {    const { ply, position } = getPosition(context, args);
    const san = String(args.move || "").trim();

    if (!san) throw new Error("Provide a SAN move");

    const board = new Chess(position.fen);
    let move;

    try {
        move = board.move(san);
    } catch {
        return {
            ply,
            move: san,
            legal: false,
            error: "Illegal move in this position"
        };
    }

    const afterFen = move.after;
    const afterBoard = new Chess(afterFen);
    const depth = clamp(Number(args.depth) || 16, 8, 20);
    const lines = await runEngine(context, afterFen, depth, 1);

    return {
        ply,
        move: move.san,
        legal: true,
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured,
        check: move.san.includes("+") || move.san.includes("#"),
        afterFen,
        material: getMaterial(afterFen),
        legalReplies: afterBoard.moves(),
        engine: lines.map(line => formatLine(line, afterFen)),
        threats: getThreats(afterFen)
    };
}

async function evaluateLine(
    context: CoachContext, args: Record<string, unknown>
) {
    const { ply, position } = getPosition(context, args);
    const moves = Array.isArray(args.moves)
        ? args.moves.filter((move): move is string => typeof move == "string")
        : [];

    if (!moves.length) throw new Error("Provide at least one SAN move");

    const board = new Chess(position.fen);
    const steps = [];

    for (const [ index, san ] of moves.entries()) {
        let move;

        try {
            move = board.move(san);
        } catch {
            return {
                ply,
                legal: false,
                failedAt: index,
                failedMove: san,
                steps
            };
        }

        steps.push({
            san: move.san,
            from: move.from,
            to: move.to,
            piece: move.piece,
            captured: move.captured,
            check: move.san.includes("+") || move.san.includes("#"),
            material: getMaterial(board.fen())
        });
    }

    const finalFen = board.fen();
    const depth = clamp(Number(args.depth) || 16, 8, 20);
    const lines = await runEngine(context, finalFen, depth, 1);

    return {
        ply,
        legal: true,
        steps,
        finalFen,
        material: getMaterial(finalFen),
        legalReplies: board.moves(),
        engine: lines.map(line => formatLine(line, finalFen))
    };
}

async function fetchJson<T>(
    url: string, signal?: AbortSignal, headers?: Record<string, string>
): Promise<T> {
    const response = await fetch(url, { signal, headers });

    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
    }

    return await response.json() as T;
}

function toSanLine(fen: string, uciMoves: string) {
    const board = new Chess(fen);
    const san: string[] = [];

    for (const uci of uciMoves.split(" ")) {
        try {
            san.push(board.move({
                from: uci.slice(0, 2),
                to: uci.slice(2, 4),
                promotion: uci[4]
            }).san);
        } catch {
            san.push(uci);
        }
    }

    return san;
}

async function queryDatabase(
    context: CoachContext, args: Record<string, unknown>, signal?: AbortSignal
) {
    const { ply, position } = getPosition(context, args);
    const source = String(args.source || "cloud");
    const fen = encodeURIComponent(position.fen);

    if (source == "tablebase") {
        const data = await fetchJson<TablebaseResponse>(
            `https://tablebase.lichess.ovh/standard?fen=${fen}`,
            signal
        );

        return {
            ply,
            source,
            category: data.category,
            dtz: data.dtz,
            dtm: data.dtm,
            moves: (data.moves ?? []).slice(0, 8).map(move => ({
                san: move.san,
                category: move.category,
                dtz: move.dtz,
                dtm: move.dtm
            }))
        };
    }

    if (source == "cloud") {
        const data = await fetchJson<CloudEval>(
            `https://lichess.org/api/cloud-eval?fen=${fen}&multiPv=2`,
            signal
        );

        return {
            ply,
            source,
            depth: data.depth,
            knodes: data.knodes,
            lines: data.pvs.map(line => ({
                san: toSanLine(position.fen, line.moves),
                centipawns: line.cp,
                mate: line.mate
            }))
        };
    }

    if (!context.lichessToken) {
        throw new Error(
            "The Lichess opening explorer now requires a token. "
            + "Add one in Coach settings, or use the cloud or tablebase source."
        );
    }

    const endpoint = source == "masters"
        ? "https://explorer.lichess.ovh/masters"
        : "https://explorer.lichess.ovh/lichess";

    const params = source == "masters"
        ? `?fen=${fen}&moves=10`
        : `?fen=${fen}&speeds=blitz,rapid,classical&ratings=1600,1800,2000&moves=10`;

    const data = await fetchJson<LichessExplorer>(endpoint + params, signal, {
        Authorization: `Bearer ${context.lichessToken}`
    });

    return {
        ply,
        source,
        totals: {
            white: data.white,
            draws: data.draws,
            black: data.black
        },
        moves: data.moves.slice(0, 10).map(move => ({
            san: move.san,
            games: move.white + move.draws + move.black,
            whiteWin: move.white,
            draw: move.draws,
            blackWin: move.black,
            averageRating: move.averageRating
        }))
    };
}

async function searchWeb(
    args: Record<string, unknown>, signal?: AbortSignal
) {
    const query = String(args.query || "").trim();
    if (!query) throw new Error("Provide a search query");

    const results: {
        title: string;
        snippet: string;
        url: string;
    }[] = [];
    let summary = "";

    try {
        const data = await fetchJson<WikipediaSearch>(
            "https://en.wikipedia.org/w/api.php?action=query"
            + `&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3`
            + "&format=json&origin=*",
            signal
        );

        for (const result of data.query?.search ?? []) {
            results.push({
                title: result.title,
                snippet: result.snippet.replace(/<[^>]+>/g, ""),
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`
            });
        }
    } catch {
        // Wikipedia can rate-limit; DuckDuckGo still gives a summary
    }

    try {
        const data = await fetchJson<DuckDuckGo>(
            "https://api.duckduckgo.com/?q="
            + `${encodeURIComponent(query)}&format=json&no_html=1`,
            signal
        );

        if (data.Abstract) {
            summary = data.Abstract;
            results.unshift({
                title: "DuckDuckGo summary",
                snippet: data.Abstract,
                url: data.AbstractURL ?? "https://duckduckgo.com/"
            });
        }

        for (const topic of (data.RelatedTopics ?? []).slice(0, 3)) {
            if (!topic.Text || !topic.FirstURL) continue;

            results.push({
                title: topic.Text.slice(0, 70),
                snippet: topic.Text,
                url: topic.FirstURL
            });
        }
    } catch {
        // Search is best-effort; the model can answer without it
    }

    return { query, summary, results: results.slice(0, 6) };
}

async function lookupPlayer(
    args: Record<string, unknown>, signal?: AbortSignal
) {
    const name = String(args.name || "").trim().toLowerCase();
    const site = String(args.site || "lichess");

    if (!name) throw new Error("Provide a player name");

    if (site == "chesscom") {
        const data = await fetchJson<ChessComPlayer>(
            `https://api.chess.com/pub/player/${encodeURIComponent(name)}`,
            signal
        );

        return {
            site,
            username: data.username,
            name: data.name,
            title: data.title,
            country: data.country,
            followers: data.followers,
            joined: data.joined,
            lastOnline: data.last_online,
            url: data.url
        };
    }

    const data = await fetchJson<LichessUser>(
        `https://lichess.org/api/user/${encodeURIComponent(name)}`,
        signal
    );

    return {
        site,
        username: data.username,
        title: data.title,
        url: data.url ?? `https://lichess.org/@/${name}`,
        joined: data.createdAt,
        lastOnline: data.seenAt,
        ratings: Object.fromEntries(
            Object.entries(data.perfs ?? {})
                .filter(([ , value ]) => value.rating)
                .map(([ key, value ]) => [ key, value.rating ])
        )
    };
}

export async function executeTool(
    call: ToolCall, context: CoachContext, signal?: AbortSignal
): Promise<ToolResult> {
    try {
        let value: unknown;

        switch (call.name) {
            case "get_game":
                value = {
                    headers: context.game.headers,
                    variation: context.isVariation,
                    moves: context.game.positions.slice(1).map((position, index) => {
                        const ply = index + 1;
                        const details = getMoveDetails(context.game, ply);

                        return {
                            ply,
                            move: position.san,
                            piece: details?.piece,
                            captured: details?.captured,
                            colour: position.colour,
                            classification: context.classifications[ply]?.classification
                        };
                    })
                };
                break;

            case "get_board": {
                const { ply, position } = getPosition(context, call.arguments);
                value = getBoardPayload(position, ply, context.game);
                break;
            }

            case "inspect_position":
                value = await inspectPosition(context, call.arguments);
                break;

            case "analyse_position":
                value = await analysePosition(context, call.arguments);
                break;

            case "compare_moves":
                value = await compareMoves(context, call.arguments);
                break;

            case "inspect_move":
                value = await inspectMove(context, call.arguments);
                break;

            case "evaluate_line":
                value = await evaluateLine(context, call.arguments);
                break;

            case "get_opening": {
                const { ply, position, explicit } = getPosition(context, call.arguments);
                value = summariseOpening(
                    position,
                    getHistory(context, ply, explicit)
                );
                break;
            }

            case "query_database":
                value = await queryDatabase(context, call.arguments, signal);
                break;

            case "lookup_player":
                value = await lookupPlayer(call.arguments, signal);
                break;

            case "calculate":
                value = {
                    expression: String(call.arguments.expression ?? ""),
                    result: calculate(String(call.arguments.expression ?? ""))
                };
                break;

            case "search_web":
                value = await searchWeb(call.arguments, signal);
                break;

            default:
                throw new Error(`Unknown tool: ${call.name}`);
        }

        return {
            id: call.id,
            name: call.name,
            content: JSON.stringify(value)
        };
    } catch (error) {
        return {
            id: call.id,
            name: call.name,
            content: JSON.stringify({
                error: error instanceof Error ? error.message : "Tool failed"
            })
        };
    }
}

