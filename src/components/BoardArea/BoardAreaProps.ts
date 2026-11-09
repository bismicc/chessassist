import { Move } from "chess.js";

import { Evaluation, PlayerInfo, Position } from "../../types";

export default interface BoardAreaProps {
    position: Position;
    white: PlayerInfo;
    black: PlayerInfo;
    flipped: boolean;
    evaluation?: Evaluation;
    size: number;
    onMove: (move: Move) => void;
}
