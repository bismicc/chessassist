import { useEffect, useRef, useState } from "react";

import Engine from "../lib/engine";
import useAiStore from "../stores/AiStore";
import { runAgent } from "../ai/agent";
import { createChatClient } from "../ai/client";
import { buildCoachSystem } from "../ai/prompt";
import { generateReport } from "../ai/report";
import { getProvider } from "../ai/providers";
import { ChatMessage, CoachMode, Usage } from "../ai/types";
import { findUnverifiedMoves, getKnownMoves } from "../ai/validate";

import {
    EngineSettings, Evaluation, GameData, MoveClassification, Position
} from "../types";

interface UseCoachOptions {
    game: GameData;
    currentPly: number;
    position: Position;
    history: string[];
    isVariation: boolean;
    classifications: (MoveClassification | undefined)[];
    evaluations: (Evaluation | undefined)[];
    bestMoves: (string | undefined)[];
    settings: EngineSettings;
    analysing: boolean;
    onAnalyseGame: () => void;
}

export interface CoachMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    tools?: string[];
    note?: string;
}

const toolLabels: Record<string, string> = {
    get_game: "Reading the game",
    get_board: "Reading the board",
    inspect_position: "Inspecting the position",
    analyse_position: "Running Stockfish",
    compare_moves: "Comparing candidate moves",
    get_opening: "Checking the opening",
    query_database: "Querying the database",
    lookup_player: "Looking up the player",
    search_web: "Searching online"
};

let messageCounter = 0;

function createId() {
    messageCounter++;

    return `coach-${Date.now()}-${messageCounter}`;
}

function trimHistory(messages: ChatMessage[]) {
    const trimmed = messages.slice(-24);

    while (trimmed.length && trimmed[0].role != "user") trimmed.shift();

    return trimmed.map(message => {
        if (message.role != "tool" || message.content.length <= 4000) {
            return message;
        }

        return { ...message, content: message.content.slice(0, 4000) };
    });
}

export default function useCoach({
    game, currentPly, position, history, isVariation, classifications,
    evaluations, bestMoves, settings, analysing, onAnalyseGame
}: UseCoachOptions) {
    const aiSettings = useAiStore(state => state.settings);
    const setAiSettings = useAiStore(state => state.setSettings);
    const setMode = useAiStore(state => state.setMode);

    const [ messages, setMessages ] = useState<CoachMessage[]>([]);
    const [ input, setInput ] = useState("");
    const [ busy, setBusy ] = useState(false);
    const [ status, setStatus ] = useState("");
    const [ error, setError ] = useState("");
    const [ engineError, setEngineError ] = useState("");
    const [ pendingMode, setPendingMode ] = useState<CoachMode>();
    const [ usage, setUsage ] = useState<Usage>({ inputTokens: 0, outputTokens: 0 });

    const engineRef = useRef<Engine | null>(null);
    const abortRef = useRef<AbortController>();
    const conversation = useRef<ChatMessage[]>([]);

    const provider = getProvider(aiSettings.provider);
    const hasKey = !provider.requiresKey
        || !!aiSettings.keys[aiSettings.provider]?.trim();
    const configured = hasKey && !!aiSettings.model.trim();

    useEffect(() => {
        return () => {
            abortRef.current?.abort();
            engineRef.current?.destroy();
            engineRef.current = null;
        };
    }, []);

    useEffect(() => {
        abortRef.current?.abort();
        engineRef.current?.stop();
        setBusy(false);
        setStatus("");
        setMessages([]);
        conversation.current = [];
        setUsage({ inputTokens: 0, outputTokens: 0 });
        setError("");
        setPendingMode(undefined);
    }, [ game ]);

    useEffect(() => {
        if (!pendingMode || analysing) return;

        if (classifications.length < game.positions.length) {
            setPendingMode(undefined);
            return;
        }

        const mode = pendingMode;
        setPendingMode(undefined);
        void generate(mode);
    }, [ analysing, classifications.length, pendingMode ]);

    function getContext() {
        if (!engineRef.current) {
            engineRef.current = new Engine(setEngineError);
        }

        return {
            game,
            currentPly,
            position,
            history,
            isVariation,
            classifications,
            evaluations,
            bestMoves,
            settings,
            engine: engineRef.current,
            lichessToken: aiSettings.lichessToken?.trim() ?? ""
        };
    }

    function addAssistant(content: string, tools?: string[], note?: string) {
        setMessages(current => [
            ...current,
            { id: createId(), role: "assistant", content, tools, note }
        ]);
    }

    async function send(message?: string) {
        const text = (message ?? input).trim();
        if (!text || busy) return;

        if (!configured) {
            setError("Add an API key and model in Coach settings first");
            return;
        }

        setInput("");

        const controller = new AbortController();
        abortRef.current = controller;

        setBusy(true);
        setStatus("Thinking");
        setError("");
        setMessages(current => [
            ...current,
            { id: createId(), role: "user", content: text }
        ]);

        try {
            const client = createChatClient(aiSettings);
            const usedTools = new Set<string>();

            const result = await runAgent({
                client,
                context: getContext(),
                messages: [
                    {
                        role: "system",
                        content: buildCoachSystem(game, currentPly, isVariation)
                    },
                    ...conversation.current,
                    { role: "user", content: text }
                ],
                signal: controller.signal,
                thinking: true,
                onTool: (name, state) => {
                    if (state != "start") return;

                    usedTools.add(name);
                    setStatus(toolLabels[name] ?? "Working");
                }
            });

            if (!result.content.trim()) {
                throw new Error("The model returned an empty answer");
            }

            conversation.current = trimHistory(result.messages.filter(
                item => item.role != "system"
            ));

            conversation.current.push({
                role: "assistant",
                content: result.content
            });

            setUsage(current => ({
                inputTokens: current.inputTokens + result.usage.inputTokens,
                outputTokens: current.outputTokens + result.usage.outputTokens
            }));

            const toolText = result.messages
                .filter(item => item.role == "tool")
                .map(item => item.content)
                .join(" ");
            const unverified = findUnverifiedMoves(
                result.content,
                getKnownMoves(game, bestMoves, toolText)
            );

            addAssistant(
                result.content,
                [ ...usedTools ],
                unverified.length
                    ? `Could not verify: ${unverified.join(", ")}`
                    : undefined
            );
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

    async function generate(mode: CoachMode) {
        if (busy) return;

        if (!configured) {
            setError("Add an API key and model in Coach settings first");
            return;
        }

        if (classifications.length < game.positions.length) {
            setPendingMode(mode);
            onAnalyseGame();
            return;
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setBusy(true);
        setError("");
        setStatus("Preparing the game");

        try {
            const client = createChatClient(aiSettings);
            const content = await generateReport(
                mode,
                { game, classifications, evaluations, bestMoves },
                client,
                setStatus,
                result => {
                    if (!result) return;

                    setUsage(current => ({
                        inputTokens: current.inputTokens + result.inputTokens,
                        outputTokens: current.outputTokens + result.outputTokens
                    }));
                },
                controller.signal
            );

            if (!content.trim()) {
                throw new Error("The model returned an empty report");
            }

            conversation.current = trimHistory([
                ...conversation.current,
                { role: "user", content: `Generate a ${mode} report for this game.` },
                { role: "assistant", content }
            ]);

            addAssistant(content);
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
        engineRef.current?.stop();
        setBusy(false);
        setStatus("");
    }

    function clearChat() {
        stop();
        setMessages([]);
        conversation.current = [];
        setUsage({ inputTokens: 0, outputTokens: 0 });
        setError("");
        setPendingMode(undefined);
    }

    function explainCurrent() {
        if (!position.san) return;

        const label = `${position.moveNumber}${position.colour == "w" ? "." : "..."} ${position.san}`;

        void send(`Explain ${label}: was it a good move, and what was the best move?`);
    }

    return {
        aiSettings,
        setAiSettings,
        setMode,
        messages,
        input,
        setInput,
        busy,
        status,
        error,
        engineError,
        pendingMode,
        usage,
        configured,
        hasKey,
        provider,
        send,
        generate,
        stop,
        clearChat,
        explainCurrent
    };
}
