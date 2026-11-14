import {
    EngineSettings, Evaluation, GameData, MoveClassification, Position
} from "../../types";
import { OpeningContext } from "../../lib/openings";

export default interface CoachPanelProps {
    game: GameData;
    currentPly: number;
    position: Position;
    history: string[];
    isVariation: boolean;
    classifications: (MoveClassification | undefined)[];
    evaluations: (Evaluation | undefined)[];
    bestMoves: (string | undefined)[];
    opening: OpeningContext;
    settings: EngineSettings;
    analysing: boolean;
    progress: number;
    onAnalyseGame: () => void;
    onStopAnalysis: () => void;
    onPlayLine: (startPly: number | undefined, moves: string[]) => void;
}
