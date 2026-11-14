export type AiProviderId =
    "openai" | "anthropic" | "google" | "openrouter" | "deepseek"
    | "groq" | "mistral" | "xai" | "together" | "ollama" | "custom";

export type CoachMode = "manual" | "key" | "brief" | "full";

export interface AiModel {
    id: string;
    label: string;
}

export interface AiProvider {
    id: AiProviderId;
    name: string;
    baseUrl: string;
    requiresKey: boolean;
    browser: "likely" | "unclear";
    models: AiModel[];
}

export interface AiSettings {
    provider: AiProviderId;
    model: string;
    keys: Partial<Record<AiProviderId, string>>;
    baseUrl: string;
    lichessToken: string;
    mode: CoachMode;
}

export interface Usage {
    inputTokens: number;
    outputTokens: number;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface ToolResult {
    id: string;
    name: string;
    content: string;
}

export type ChatMessage =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
    | { role: "tool"; toolCallId: string; name: string; content: string };

export interface Completion {
    content: string;
    toolCalls: ToolCall[];
    usage?: Usage;
}

export interface JsonSchema {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: JsonSchema;
}

export interface CompletionOptions {
    thinking?: boolean;
    temperature?: number;
}

export interface ChatClient {
    complete(
        messages: ChatMessage[],
        tools: ToolDefinition[],
        signal?: AbortSignal,
        options?: CompletionOptions
    ): Promise<Completion>;
}
