import { MoveClassification, Position } from "../../types";

export default interface MoveListProps {
    positions: Position[];
    currentPly: number;
    classifications: (MoveClassification | undefined)[];
    onSelect: (ply: number) => void;
}
