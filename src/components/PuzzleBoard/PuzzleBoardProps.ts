import { Square } from "react-chessboard/dist/chessboard/types";

export default interface PuzzleBoardProps {
    fen: string;
    orientation: "white" | "black";
    size: number;
    lastMove?: {
        from: Square;
        to: Square;
    };
    disabled?: boolean;
    onMove: (from: Square, to: Square, promotion?: string) => void;
}
