import { AiSettings } from "../../ai/types";

export default interface AiSettingsDialogProps {
    settings: AiSettings;
    onChange: (settings: AiSettings) => void;
    onClose: () => void;
}
