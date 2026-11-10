import { EngineLine } from "../../types";

export default interface EngineLinesProps {
    lines: EngineLine[];
    gameOver: boolean;
    onPlayLine: (line: EngineLine) => void;
}
