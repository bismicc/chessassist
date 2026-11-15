import { Move } from "chess.js";
import { Square } from "react-chessboard/dist/chessboard/types";

export default interface OpeningBoardProps {
    fen: string;
    orientation: "white" | "black";
    size: number;
    lastMove?: { from: Square; to: Square };
    onMove: (move: Move) => void;
}
