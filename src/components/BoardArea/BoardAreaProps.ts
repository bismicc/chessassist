import { Move } from "chess.js";

import { Evaluation, MoveClassification, PlayerInfo, Position } from "../../types";

export default interface BoardAreaProps {
    position: Position;
    white: PlayerInfo;
    black: PlayerInfo;
    whiteClock?: string;
    blackClock?: string;
    flipped: boolean;
    evaluation?: Evaluation;
    classification?: MoveClassification;
    size: number;
    onMove: (move: Move) => void;
}
