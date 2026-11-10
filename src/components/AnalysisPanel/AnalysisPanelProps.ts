import {
    EngineLine, EngineSettings, GameData, MoveClassification
} from "../../types";

export default interface AnalysisPanelProps {
    game: GameData;
    currentPly: number;
    lines: EngineLine[];
    settings: EngineSettings;
    classifications: (MoveClassification | undefined)[];
    analysing: boolean;
    progress: number;
    error: string;
    variationMoves: string[];
    onImport: () => void;
    onSettings: () => void;
    onFlip: () => void;
    onSelectPly: (ply: number) => void;
    onExitVariation: () => void;
    onAnalyseGame: () => void;
    onStopAnalysis: () => void;
}
