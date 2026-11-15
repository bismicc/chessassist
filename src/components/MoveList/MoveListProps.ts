import {
    GameVariation, MoveClassification, Position
} from "../../types";

export default interface MoveListProps {
    positions: Position[];
    currentPly: number;
    classifications: (MoveClassification | undefined)[];
    variations: GameVariation[];
    activeVariationId?: string;
    activeVariationIndex?: number;
    onSelect: (ply: number) => void;
    onSelectVariation: (variation: GameVariation, index: number) => void;
}
