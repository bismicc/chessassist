import { create } from "zustand";
import { persist } from "zustand/middleware";

import { EngineSettings } from "../types";

interface SettingsStore {
    settings: EngineSettings;
    setSettings: (settings: EngineSettings) => void;
}

const defaultSettings: EngineSettings = {
    depth: 16,
    lines: 2,
    hash: 64
};

const useSettingsStore = create<SettingsStore>()(persist(set => ({
    settings: defaultSettings,
    setSettings: settings => set({ settings })
}), {
    name: "chessassist.settings"
}));

export default useSettingsStore;
