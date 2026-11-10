import { Square } from "react-chessboard/dist/chessboard/types";

export type Colour = "w" | "b";

export interface PlayerInfo {
    name: string;
    elo?: string;
}

export interface Position {
    fen: string;
    san?: string;
    from?: Square;
    to?: Square;
    moveNumber: number;
    colour: Colour;
}

export interface GameData {
    headers: Record<string, string>;
    positions: Position[];
}

export type EvaluationType = "centipawn" | "mate";

export interface Evaluation {
    type: EvaluationType;
    value: number;
}

export type Classification = "best" | "good" | "mistake" | "blunder";

export interface MoveClassification {
    classification: Classification;
    pointLoss: number;
}

export interface EngineLine {
    multipv: number;
    depth: number;
    evaluation: Evaluation;
    uciMoves: string[];
    sanMoves: string[];
}

export interface EngineSettings {
    depth: number;
    lines: number;
    hash: number;
}
