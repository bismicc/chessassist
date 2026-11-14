import { create } from "zustand";
import { persist } from "zustand/middleware";

import { defaultModel, defaultProvider } from "../ai/providers";
import { AiSettings, CoachMode } from "../ai/types";

interface AiStore {
    settings: AiSettings;
    setSettings: (settings: AiSettings) => void;
    setMode: (mode: CoachMode) => void;
}

const defaultSettings: AiSettings = {
    provider: defaultProvider,
    model: defaultModel,
    keys: {},
    baseUrl: "",
    lichessToken: "",
    mode: "manual"
};

const useAiStore = create<AiStore>()(persist(set => ({
    settings: defaultSettings,
    setSettings: settings => set({ settings }),
    setMode: mode => set(state => ({
        settings: { ...state.settings, mode }
    }))
}), {
    name: "chessasist.ai"
}));

export default useAiStore;
