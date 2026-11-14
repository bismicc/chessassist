import { ToolDefinition } from "./types";

export const toolDefinitions: ToolDefinition[] = [
    {
        name: "get_game",
        description: "Get the game headers, result, and every move with ply number and classification. Use this to find the ply for a named move.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    },
    {
        name: "get_board",
        description: "Get the board diagram, FEN, material, legal moves, and last move for a position.",
        parameters: {
            type: "object",
            properties: {
                ply: {
                    type: "number",
                    description: "Ply to inspect. Omit for the current position."
                }
            },
            additionalProperties: false
        }
    },
    {
        name: "inspect_position",
        description: "Get board, Stockfish evaluation, active threats, opening context, and classification in one call. Use this first for most questions. Pass the exact ply when the user names a move.",
        parameters: {
            type: "object",
            properties: {
                ply: {
                    type: "number",
                    description: "Ply to inspect. Omit for the current position."
                },
                depth: {
                    type: "number",
                    description: "Stockfish depth from 8 to 22."
                }
            },
            additionalProperties: false
        }
    },
    {
        name: "analyse_position",
        description: "Run Stockfish for deeper or extra principal variations. Pass the exact ply when the user names a move.",
        parameters: {
            type: "object",
            properties: {
                ply: {
                    type: "number",
                    description: "Ply to analyse. Omit for the current position."
                },
                depth: {
                    type: "number",
                    description: "Stockfish depth from 8 to 22."
                },
                lines: {
                    type: "number",
                    description: "Number of engine lines from 1 to 3."
                }
            },
            additionalProperties: false
        }
    },
    {
        name: "compare_moves",
        description: "Compare candidate SAN moves against Stockfish's best move in a position.",
        parameters: {
            type: "object",
            properties: {
                moves: {
                    type: "array",
                    items: { type: "string" },
                    description: "Candidate moves in SAN, for example Nf5 or O-O."
                },
                ply: {
                    type: "number",
                    description: "Ply to inspect. Omit for the current position."
                },
                depth: {
                    type: "number",
                    description: "Stockfish depth from 8 to 20."
                }
            },
            required: [ "moves" ],
            additionalProperties: false
        }
    },
    {
        name: "inspect_move",
        description: "Inspect one candidate SAN move: legality, capture, material after it, every legal reply, and the engine line. Use this for checks and captures before claiming a recapture is forced.",
        parameters: {
            type: "object",
            properties: {
                move: {
                    type: "string",
                    description: "Candidate move in SAN, for example Nxd3+."
                },
                ply: {
                    type: "number",
                    description: "Ply to inspect. Omit for the current position."
                },
                depth: {
                    type: "number",
                    description: "Stockfish depth from 8 to 20."
                }
            },
            required: [ "move" ],
            additionalProperties: false
        }
    },
    {
        name: "evaluate_line",
        description: "Play a sequence of SAN moves from a position and return each step, material after each move, every legal reply at the end, and the engine evaluation. Use this to verify a multi-move line before quoting it.",
        parameters: {
            type: "object",
            properties: {
                moves: {
                    type: "array",
                    items: { type: "string" },
                    description: "Moves in SAN order, for example [\"Nxd3+\", \"Rxd3\", \"Rxe1+\"]."
                },
                ply: {
                    type: "number",
                    description: "Ply to start from. Omit for the current position."
                },
                depth: {
                    type: "number",
                    description: "Stockfish depth from 8 to 20."
                }
            },
            required: [ "moves" ],
            additionalProperties: false
        }
    },
    {
        name: "get_opening",
        description: "Get the opening name, ECO code, book moves, and win rates for a position.",
        parameters: {
            type: "object",
            properties: {
                ply: {
                    type: "number",
                    description: "Ply to inspect. Omit for the current position."
                }
            },
            additionalProperties: false
        }
    },
    {
        name: "query_database",
        description: "Query the Lichess cloud evaluation, Lichess opening explorer, or Syzygy tablebase for a position. The opening explorer needs a Lichess token in settings; cloud and tablebase do not.",
        parameters: {
            type: "object",
            properties: {
                source: {
                    type: "string",
                    enum: [ "cloud", "lichess", "masters", "tablebase" ],
                    description: "Database to query."
                },
                ply: {
                    type: "number",
                    description: "Ply to inspect. Omit for the current position."
                }
            },
            required: [ "source" ],
            additionalProperties: false
        }
    },
    {
        name: "lookup_player",
        description: "Look up a player's profile and ratings on Lichess or Chess.com.",
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Username on the selected site."
                },
                site: {
                    type: "string",
                    enum: [ "lichess", "chesscom" ],
                    description: "Site to query. Defaults to Lichess."
                }
            },
            required: [ "name" ],
            additionalProperties: false
        }
    },
    {
        name: "calculate",
        description: "Evaluate an arithmetic expression. Supports + - * / % ^, parentheses, and sqrt, abs, round, floor, ceil, min, max, pow, log, exp. Use it instead of doing arithmetic mentally.",
        parameters: {
            type: "object",
            properties: {
                expression: {
                    type: "string",
                    description: "Expression such as (5.3 - 1.2) * 2 or sqrt(144)."
                }
            },
            required: [ "expression" ],
            additionalProperties: false
        }
    },
    {
        name: "search_web",
        description: "Search Wikipedia and DuckDuckGo for general chess context such as opening plans, players, or history. Do not use it for position facts.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query."
                }
            },
            required: [ "query" ],
            additionalProperties: false
        }
    }
];
