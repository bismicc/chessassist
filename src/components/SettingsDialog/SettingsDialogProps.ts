import { EngineSettings } from "../../types";

export default interface SettingsDialogProps {
    settings: EngineSettings;
    onChange: (settings: EngineSettings) => void;
    onClose: () => void;
}
