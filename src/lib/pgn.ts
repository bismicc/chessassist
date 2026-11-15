import { Chess, Move, Square } from "chess.js";

import {
    Classification, GameData, GameVariation, PlayerInfo, Position
} from "../types";
import { toUci } from "./chess";

export const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const samplePgn = `[Event "Casual Game"]
[Site "Chessassist"]
[Date "2026.11.08"]
[White "NyleTheRiver"]
[Black "E4NC390"]
[Result "1-0"]
[WhiteElo "1867"]
[BlackElo "1831"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0
`;

interface Annotation {
    classification: Classification;
    mark: string;
}

const annotations: Record<string, Annotation> = {
    "!": { classification: "great", mark: "!" },
    "?": { classification: "mistake", mark: "?" },
    "!!": { classification: "brilliant", mark: "!!" },
    "??": { classification: "blunder", mark: "??" },
    "!?": { classification: "good", mark: "!?" },
    "?!": { classification: "mistake", mark: "?!" },
    "□": { classification: "best", mark: "□" }
};

const nagAnnotations: Record<number, Annotation> = {
    1: annotations["!"],
    2: annotations["?"],
    3: annotations["!!"],
    4: annotations["??"],
    5: annotations["!?"],
    6: annotations["?!"],
    7: annotations["□"]
};

const headerPattern = /\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]/g;

function extractHeaders(pgn: string) {
    const headers: Record<string, string> = {};

    for (const match of pgn.matchAll(headerPattern)) {
        headers[match[1]] = match[2]
            .replace(/\\"/g, "\"")
            .replace(/\\\\/g, "\\");
    }

    return {
        headers,
        movetext: pgn.replace(headerPattern, " ")
    };
}

function formatClock(value: string) {
    const parts = value.split(":");

    if (parts.length < 2 || parts.some(part => Number.isNaN(Number(part)))) {
        return value;
    }

    const seconds = Number(parts.at(-1));
    const minutes = Number(parts.at(-2));
    const hours = parts.length > 2 ? Number(parts[0]) : 0;
    const paddedSeconds = String(Math.floor(seconds)).padStart(2, "0");
    const tenths = seconds % 1
        ? `.${String(seconds).split(".")[1]}`
        : "";

    if (hours) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}${tenths}`;
    }

    return `${minutes}:${paddedSeconds}${tenths}`;
}

function extractClock(text: string) {
    const match = text.match(/\[%clk\s+([^\]]+)\]/);

    if (!match) return { text, clock: undefined };

    return {
        text: text.replace(match[0], " "),
        clock: formatClock(match[1].trim())
    };
}

function cleanComment(text: string) {
    const marks: Record<string, string> = {
        "1": "!",
        "2": "?",
        "3": "!!",
        "4": "??",
        "5": "!?",
        "6": "?!"
    };

    return text
        .replace(/\$([1-6])/g, (_match, mark: string) => marks[mark] ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

function readComment(text: string, start: number) {
    const end = text.indexOf("}", start + 1);
    const next = end == -1 ? text.length : end + 1;

    return {
        text: text.slice(start + 1, end == -1 ? text.length : end),
        next
    };
}

function skipVariation(text: string, start: number) {
    return readVariation(text, start).next;
}

function readVariation(text: string, start: number) {
    let depth = 1;
    let index = start + 1;
    const contentStart = start + 1;

    while (index < text.length) {
        const character = text[index];

        if (character == "{") {
            index = readComment(text, index).next;
            continue;
        }

        if (character == ";") {
            const newline = text.indexOf("\n", index);
            index = newline == -1 ? text.length : newline + 1;
            continue;
        }

        if (character == "(") depth++;
        if (character == ")") {
            depth--;
            if (!depth) {
                return {
                    text: text.slice(contentStart, index),
                    next: index + 1
                };
            }
        }

        index++;
    }

    return {
        text: text.slice(contentStart),
        next: text.length
    };
}

function getAnnotation(san: string) {
    const match = san.match(/(!!|\?\?|!\?|\?!|!|\?)$/);

    if (!match) return { san, annotation: undefined };

    return {
        san: san.slice(0, -match[0].length),
        annotation: annotations[match[0]]
    };
}

function toPosition(move: Move, annotation?: Annotation): Position {
    return {
        fen: move.after,
        san: move.san,
        uci: toUci(move),
        from: move.from as Square,
        to: move.to as Square,
        moveNumber: Number(move.before.split(" ")[5]) || 1,
        colour: move.color,
        annotation: annotation?.classification,
        annotationMark: annotation?.mark
    };
}

export function parsePgn(pgn: string): GameData {
    const { headers, movetext } = extractHeaders(pgn.trim());
    const board = new Chess(headers.FEN || undefined);
    const startFen = board.fen();
    const positions: Position[] = [
        {
            fen: startFen,
            moveNumber: Number(startFen.split(" ")[5]) || 1,
            colour: startFen.split(" ")[1] == "b" ? "b" : "w"
        }
    ];

    const variations: GameVariation[] = [];

    let index = 0;
    let lastMove = -1;

    function addComment(text: string) {
        const extracted = extractClock(text);
        const comment = cleanComment(extracted.text);

        if (extracted.clock && lastMove >= 0) {
            positions[lastMove].clock = extracted.clock;
        }

        if (!comment) return;

        const position = positions[lastMove] ?? positions[0];
        position.comment = position.comment
            ? `${position.comment} ${comment}`
            : comment;
    }

    function addAnnotation(annotation?: Annotation) {
        if (!annotation || lastMove < 1) return;

        positions[lastMove].annotation = annotation.classification;
        positions[lastMove].annotationMark = annotation.mark;
    }

    function addMove(raw: string) {
        let token = raw;

        if (!token) return;
        if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) return;

        const number = token.match(/^\d+\.+/);
        if (number) token = token.slice(number[0].length);

        if (!token || token == "..." || token == ".." || token == "e.p.") return;

        const parsed = getAnnotation(token);
        let san = parsed.san;

        if (!san) return;

        if (/^[0O]-[0O]/.test(san)) san = san.replace(/0/g, "O");

        let move: Move;

        try {
            move = board.move(san);
        } catch {
            throw new Error(
                `Could not read move ${raw} after ${Math.floor((positions.length - 1) / 2)} moves`
            );
        }

        positions.push(toPosition(move, parsed.annotation));
        lastMove = positions.length - 1;
    }

    function parseVariation(
        text: string, startFen: string, rootPly: number
    ): GameVariation | undefined {
        const variationBoard = new Chess(startFen);
        const variationPositions: Position[] = [];
        let variationComment = "";
        let variationLast = -1;
        let cursor = 0;

        function addVariationComment(raw: string) {
            const extracted = extractClock(raw);
            const comment = cleanComment(extracted.text);

            if (extracted.clock && variationLast >= 0) {
                variationPositions[variationLast].clock = extracted.clock;
            }

            if (!comment) return;

            if (variationLast < 0) {
                variationComment = variationComment
                    ? `${variationComment} ${comment}`
                    : comment;
                return;
            }

            const position = variationPositions[variationLast];
            position.comment = position.comment
                ? `${position.comment} ${comment}`
                : comment;
        }

        function addVariationAnnotation(annotation?: Annotation) {
            if (!annotation || variationLast < 0) return;

            variationPositions[variationLast].annotation = annotation.classification;
            variationPositions[variationLast].annotationMark = annotation.mark;
        }

        function addVariationMove(raw: string) {
            let token = raw;

            if (!token || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) return;

            const number = token.match(/^\d+\.+/);
            if (number) token = token.slice(number[0].length);

            if (!token || token == "..." || token == ".." || token == "e.p.") return;

            const parsed = getAnnotation(token);
            let san = parsed.san;

            if (!san) return;
            if (/^[0O]-[0O]/.test(san)) san = san.replace(/0/g, "O");

            try {
                const move = variationBoard.move(san);
                variationPositions.push(toPosition(move, parsed.annotation));
                variationLast = variationPositions.length - 1;
            } catch {
                cursor = text.length;
            }
        }

        while (cursor < text.length) {
            const character = text[cursor];

            if (/\s/.test(character)) {
                cursor++;
                continue;
            }

            if (character == "{") {
                const comment = readComment(text, cursor);
                addVariationComment(comment.text);
                cursor = comment.next;
                continue;
            }

            if (character == ";") {
                const newline = text.indexOf("\n", cursor);
                cursor = newline == -1 ? text.length : newline + 1;
                continue;
            }

            if (character == "(") {
                cursor = skipVariation(text, cursor);
                continue;
            }

            if (character == "$") {
                const match = text.slice(cursor).match(/^\$(\d+)/);

                if (match) {
                    addVariationAnnotation(nagAnnotations[Number(match[1])]);
                    cursor += match[0].length;
                    continue;
                }

                cursor++;
                continue;
            }

            let end = cursor;

            while (
                end < text.length
                && !/\s/.test(text[end])
                && !"{;()$".includes(text[end])
            ) end++;

            addVariationMove(text.slice(cursor, end));
            cursor = end;
        }

        if (!variationPositions.length) return;

        return {
            id: `pgn-${rootPly}-${variations.length}`,
            rootPly,
            positions: variationPositions,
            comment: variationComment || undefined
        };
    }

    while (index < movetext.length) {
        const character = movetext[index];

        if (/\s/.test(character)) {
            index++;
            continue;
        }

        if (character == "{") {
            const comment = readComment(movetext, index);
            addComment(comment.text);
            index = comment.next;
            continue;
        }

        if (character == ";") {
            const newline = movetext.indexOf("\n", index);
            index = newline == -1 ? movetext.length : newline + 1;
            continue;
        }

        if (character == "(") {
            const rootPly = Math.max(0, lastMove - 1);
            const variation = readVariation(movetext, index);

            try {
                const parsed = parseVariation(
                    variation.text,
                    positions[rootPly]?.fen ?? startFen,
                    rootPly
                );

                if (parsed) variations.push(parsed);
            } catch {
                // A broken variation should not reject the mainline
            }

            index = variation.next;
            continue;
        }

        if (character == ")") {
            index++;
            continue;
        }

        if (character == "$") {
            const match = movetext.slice(index).match(/^\$(\d+)/);

            if (match) {
                addAnnotation(nagAnnotations[Number(match[1])]);
                index += match[0].length;
                continue;
            }

            index++;
            continue;
        }

        if (character == "%" && (index == 0 || movetext[index - 1] == "\n")) {
            const newline = movetext.indexOf("\n", index);
            index = newline == -1 ? movetext.length : newline + 1;
            continue;
        }

        let end = index;

        while (
            end < movetext.length
            && !/\s/.test(movetext[end])
            && !"{;()$".includes(movetext[end])
        ) end++;

        addMove(movetext.slice(index, end));
        index = end;
    }

    if (positions.length == 1) {
        throw new Error("That PGN does not contain any moves");
    }

    return {
        headers,
        positions,
        variations: variations.length ? variations : undefined
    };
}

export function getPlayers(game: GameData): { white: PlayerInfo; black: PlayerInfo } {
    return {
        white: {
            name: game.headers.White || "White",
            elo: game.headers.WhiteElo
        },
        black: {
            name: game.headers.Black || "Black",
            elo: game.headers.BlackElo
        }
    };
}
