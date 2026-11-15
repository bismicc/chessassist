import { useEffect, useRef, useState } from "react";

import {
    generateOpeningLesson, generateWeaknessReview
} from "../ai/training";
import { getProvider } from "../ai/providers";
import { AiSettings, Usage } from "../ai/types";
import useAiStore from "../stores/AiStore";

export type TrainingNarrativeKind = "weakness" | "opening";

const labels: Record<TrainingNarrativeKind, string> = {
    weakness: "Writing your weakness review",
    opening: "Finding your opening weaknesses"
};

export default function useTrainingAi() {
    const settings = useAiStore(state => state.settings);
    const setSettings = useAiStore(state => state.setSettings);
    const [ content, setContent ] = useState("");
    const [ busy, setBusy ] = useState(false);
    const [ status, setStatus ] = useState("");
    const [ error, setError ] = useState("");
    const [ usage, setUsage ] = useState<Usage>({ inputTokens: 0, outputTokens: 0 });

    const abortRef = useRef<AbortController>();

    const provider = getProvider(settings.provider);
    const configured = (!provider.requiresKey
        || !!settings.keys[settings.provider]?.trim())
        && !!settings.model.trim();

    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    async function generate(kind: TrainingNarrativeKind, facts: string) {
        if (busy) return;
        if (!configured) {
            setError("Add a model and API key in the training settings first");
            return;
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setBusy(true);
        setStatus(labels[kind]);
        setError("");
        setContent("");

        try {
            const result = kind == "opening"
                ? await generateOpeningLesson(settings, facts, controller.signal)
                : await generateWeaknessReview(settings, facts, controller.signal);

            if (!result.content) throw new Error("The model returned an empty answer");

            const resultUsage = result.usage;

            setContent(result.content);
            if (resultUsage) {
                setUsage(current => ({
                    inputTokens: current.inputTokens + resultUsage.inputTokens,
                    outputTokens: current.outputTokens + resultUsage.outputTokens
                }));
            }
        } catch (requestError) {
            if (requestError instanceof DOMException && requestError.name == "AbortError") {
                return;
            }

            setError(requestError instanceof Error
                ? requestError.message
                : "The request failed"
            );
        } finally {
            setBusy(false);
            setStatus("");
            abortRef.current = undefined;
        }
    }

    function stop() {
        abortRef.current?.abort();
        setBusy(false);
        setStatus("");
    }

    function clear() {
        setContent("");
        setError("");
    }

    return {
        settings: settings as AiSettings,
        setSettings,
        content,
        busy,
        status,
        error,
        usage,
        configured,
        generate,
        stop,
        clear
    };
}
