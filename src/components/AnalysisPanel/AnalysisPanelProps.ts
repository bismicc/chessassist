import { EngineLine, EngineSettings, GameData } from "../../types";

export default interface AnalysisPanelProps {
    game: GameData;
    currentPly: number;
    lines: EngineLine[];
    settings: EngineSettings;
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
