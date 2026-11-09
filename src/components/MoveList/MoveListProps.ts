import { Position } from "../../types";

export default interface MoveListProps {
    positions: Position[];
    currentPly: number;
    onSelect: (ply: number) => void;
}
