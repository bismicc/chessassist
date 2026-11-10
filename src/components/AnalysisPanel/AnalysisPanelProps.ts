import {
    EngineLine, EngineSettings, GameData, MoveClassification
} from "../../types";
import { OpeningContext } from "../../lib/openings";

export default interface AnalysisPanelProps {
    game: GameData;
    currentPly: number;
    lines: EngineLine[];
    settings: EngineSettings;
    classifications: (MoveClassification | undefined)[];
    opening: OpeningContext;
    gameOver: boolean;
    analysing: boolean;
    progress: number;
    error: string;
    variationMoves: string[];
    variationDepth?: number;
    onImport: () => void;
    onSettings: () => void;
    onFlip: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    onBack: () => void;
    onForward: () => void;
    onStart: () => void;
    onEnd: () => void;
    onSelectPly: (ply: number) => void;
    onPlayBookMove: (san: string) => void;
    onPlayLine: (line: EngineLine) => void;
    onExitVariation: () => void;
    onAnalyseGame: () => void;
    onStopAnalysis: () => void;
}
