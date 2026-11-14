import {
    AiSettings, ChatClient, ChatMessage, ToolCall, Usage
} from "./types";
import { getProvider } from "./providers";

interface OpenAiToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

interface OpenAiMessage {
    role: string;
    content?: string | null;
    tool_calls?: OpenAiToolCall[];
    tool_call_id?: string;
}

interface OpenAiResponse {
    choices?: {
        message?: {
            content?: string | null;
            tool_calls?: OpenAiToolCall[];
        };
    }[];
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
    };
    error?: {
        message?: string;
    };
}

interface AnthropicBlock {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
}

interface AnthropicMessage {
    role: "user" | "assistant";
    content: AnthropicBlock[];
}

interface AnthropicResponse {
    content?: AnthropicBlock[];
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
    };
    error?: {
        message?: string;
    };
}

interface GeminiPart {
    text?: string;
    functionCall?: {
        name: string;
        args?: Record<string, unknown>;
    };
    functionResponse?: {
        name: string;
        response: {
            result: string;
        };
    };
}

interface GeminiContent {
    role: "user" | "model";
    parts: GeminiPart[];
}

interface GeminiResponse {
    candidates?: {
        content?: {
            parts?: GeminiPart[];
        };
    }[];
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
    };
    error?: {
        message?: string;
    };
}

function normaliseUsage(usage?: Usage): Usage | undefined {
    if (!usage) return;

    return {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0
    };
}

async function readError(response: Response) {
    const text = await response.text();

    try {
        const data = JSON.parse(text) as { error?: { message?: string } };
        return data.error?.message ?? text.slice(0, 400);
    } catch {
        return text.slice(0, 400) || `Request failed with ${response.status}`;
    }
}

async function sendRequest(
    url: string, init: RequestInit, provider: string
) {
    try {
        return await fetch(url, init);
    } catch (error) {
        if (error instanceof DOMException && error.name == "AbortError") {
            throw error;
        }

        throw new Error(
            `Could not reach ${provider}. Check your connection, API key, `
            + "base URL, and whether the browser is blocking the request. "
            + "OpenRouter or a proxy usually solves CORS."
        );
    }
}

function parseArguments(value: string | Record<string, unknown> | undefined) {
    if (!value) return {};
    if (typeof value != "string") return value;

    try {
        const parsed = JSON.parse(value) as unknown;

        return parsed && typeof parsed == "object"
            ? parsed as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

function toOpenAiMessages(messages: ChatMessage[]): OpenAiMessage[] {
    return messages.map(message => {
        if (message.role == "tool") {
            return {
                role: "tool",
                tool_call_id: message.toolCallId,
                content: message.content
            };
        }

        if (message.role == "assistant") {
            return {
                role: "assistant",
                content: message.content || null,
                tool_calls: message.toolCalls?.map(call => ({
                    id: call.id,
                    type: "function",
                    function: {
                        name: call.name,
                        arguments: JSON.stringify(call.arguments)
                    }
                }))
            };
        }

        return { role: message.role, content: message.content };
    });
}

function toAnthropicMessages(messages: ChatMessage[]) {
    const system = messages
        .filter(message => message.role == "system")
        .map(message => message.content)
        .join("\n\n");

    const converted: AnthropicMessage[] = [];

    function push(role: "user" | "assistant", blocks: AnthropicBlock[]) {
        if (!blocks.length) return;

        const last = converted.at(-1);

        if (last?.role == role) {
            last.content.push(...blocks);
            return;
        }

        converted.push({ role, content: blocks });
    }

    for (const message of messages) {
        if (message.role == "system") continue;

        if (message.role == "tool") {
            push("user", [{
                type: "tool_result",
                tool_use_id: message.toolCallId,
                content: message.content
            }]);

            continue;
        }

        if (message.role == "assistant") {
            const blocks: AnthropicBlock[] = [];

            if (message.content) {
                blocks.push({ type: "text", text: message.content });
            }

            for (const call of message.toolCalls ?? []) {
                blocks.push({
                    type: "tool_use",
                    id: call.id,
                    name: call.name,
                    input: call.arguments
                });
            }

            push("assistant", blocks);
            continue;
        }

        push("user", [{ type: "text", text: message.content }]);
    }

    return { system, messages: converted };
}

function toGeminiContents(messages: ChatMessage[]) {
    const contents: GeminiContent[] = [];

    function push(role: "user" | "model", parts: GeminiPart[]) {
        if (!parts.length) return;

        const last = contents.at(-1);

        if (last?.role == role) {
            last.parts.push(...parts);
            return;
        }

        contents.push({ role, parts });
    }

    for (const message of messages) {
        if (message.role == "system") continue;

        if (message.role == "tool") {
            push("user", [{
                functionResponse: {
                    name: message.name,
                    response: { result: message.content }
                }
            }]);

            continue;
        }

        if (message.role == "assistant") {
            const parts: GeminiPart[] = [];

            if (message.content) parts.push({ text: message.content });

            for (const call of message.toolCalls ?? []) {
                parts.push({
                    functionCall: {
                        name: call.name,
                        args: call.arguments
                    }
                });
            }

            push("model", parts);
            continue;
        }

        push("user", [{ text: message.content }]);
    }

    return contents;
}

function createOpenAiClient(settings: AiSettings): ChatClient {
    const provider = getProvider(settings.provider);

    return {
        async complete(messages, tools, signal, options) {
            const baseUrl = (settings.baseUrl.trim() || provider.baseUrl).replace(/\/$/, "");

            if (!baseUrl) {
                throw new Error("Set an API base URL in the coach settings");
            }

            const body: Record<string, unknown> = {
                model: settings.model.trim(),
                messages: toOpenAiMessages(messages)
            };

            if (settings.provider == "openai") {
                body.max_completion_tokens = 6000;
            } else {
                body.max_tokens = 6000;
            }

            if (options?.temperature != undefined) {
                body.temperature = options.temperature;
            }

            if (settings.provider == "deepseek") {
                if (options?.thinking) {
                    body.thinking = { type: "enabled" };
                    body.reasoning_effort = "high";
                    body.max_tokens = 12000;
                } else {
                    body.thinking = { type: "disabled" };
                }
            }

            if (tools.length) {
                body.tools = tools.map(tool => ({
                    type: "function",
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                }));

                body.tool_choice = "auto";
            }

            const headers: Record<string, string> = {
                "Content-Type": "application/json"
            };

            const key = settings.keys[settings.provider]?.trim();

            if (key) headers.Authorization = `Bearer ${key}`;

            if (settings.provider == "openrouter") {
                headers["HTTP-Referer"] = window.location.origin;
                headers["X-Title"] = "Chessasist";
            }

            const response = await sendRequest(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal
            }, provider.name);

            if (!response.ok) throw new Error(await readError(response));

            const data = await response.json() as OpenAiResponse;
            const message = data.choices?.[0]?.message;

            return {
                content: message?.content ?? "",
                toolCalls: (message?.tool_calls ?? []).map(call => ({
                    id: call.id,
                    name: call.function.name,
                    arguments: parseArguments(call.function.arguments)
                })),
                usage: normaliseUsage(data.usage
                    ? {
                        inputTokens: data.usage.prompt_tokens ?? 0,
                        outputTokens: data.usage.completion_tokens ?? 0
                    }
                    : undefined
                )
            };
        }
    };
}

function createAnthropicClient(settings: AiSettings): ChatClient {
    const provider = getProvider(settings.provider);

    return {
        async complete(messages, tools, signal, options) {
            const baseUrl = (settings.baseUrl.trim() || provider.baseUrl).replace(/\/$/, "");
            const converted = toAnthropicMessages(messages);
            const key = settings.keys[settings.provider]?.trim();

            const body: Record<string, unknown> = {
                model: settings.model.trim(),
                max_tokens: 6000,
                messages: converted.messages
            };

            if (options?.temperature != undefined) {
                body.temperature = options.temperature;
            }

            if (converted.system) body.system = converted.system;

            if (options?.temperature != undefined) {
                body.temperature = options.temperature;
            }

            if (tools.length) {
                body.tools = tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.parameters
                }));
            }

            const response = await sendRequest(`${baseUrl}/v1/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": key ?? "",
                    "anthropic-version": "2023-06-01",
                    "anthropic-dangerous-direct-browser-access": "true"
                },
                body: JSON.stringify(body),
                signal
            }, provider.name);

            if (!response.ok) throw new Error(await readError(response));

            const data = await response.json() as AnthropicResponse;
            const blocks = data.content ?? [];

            return {
                content: blocks
                    .filter(block => block.type == "text")
                    .map(block => block.text ?? "")
                    .join("\n")
                    .trim(),
                toolCalls: blocks
                    .filter(block => block.type == "tool_use")
                    .map(block => ({
                        id: block.id ?? crypto.randomUUID(),
                        name: block.name ?? "",
                        arguments: block.input ?? {}
                    })),
                usage: normaliseUsage(data.usage
                    ? {
                        inputTokens: data.usage.input_tokens ?? 0,
                        outputTokens: data.usage.output_tokens ?? 0
                    }
                    : undefined
                )
            };
        }
    };
}

function sanitiseGeminiSchema(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sanitiseGeminiSchema);

    if (!value || typeof value != "object") return value;

    const result: Record<string, unknown> = {};

    for (const [ key, item ] of Object.entries(value)) {
        if (key == "additionalProperties") continue;

        result[key] = sanitiseGeminiSchema(item);
    }

    return result;
}

function createGeminiClient(settings: AiSettings): ChatClient {
    const provider = getProvider(settings.provider);

    return {
        async complete(messages, tools, signal, options) {
            const baseUrl = (settings.baseUrl.trim() || provider.baseUrl).replace(/\/$/, "");
            const key = settings.keys[settings.provider]?.trim();
            const system = messages
                .filter(message => message.role == "system")
                .map(message => message.content)
                .join("\n\n");
            const generationConfig: Record<string, unknown> = {
                maxOutputTokens: 6000
            };

            if (options?.temperature != undefined) {
                generationConfig.temperature = options.temperature;
            }

            const body: Record<string, unknown> = {
                contents: toGeminiContents(messages),
                generationConfig
            };

            if (system) {
                body.systemInstruction = {
                    parts: [{ text: system }]
                };
            }

            if (tools.length) {
                body.tools = [{
                    functionDeclarations: tools.map(tool => ({
                        name: tool.name,
                        description: tool.description,
                        parameters: sanitiseGeminiSchema(tool.parameters)
                    }))
                }];
            }

            const response = await sendRequest(
                `${baseUrl}/models/${settings.model.trim()}:generateContent?key=${encodeURIComponent(key ?? "")}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body),
                    signal
                },
                provider.name
            );

            if (!response.ok) throw new Error(await readError(response));

            const data = await response.json() as GeminiResponse;
            const parts = data.candidates?.[0]?.content?.parts ?? [];
            const toolCalls: ToolCall[] = [];

            for (const [ index, part ] of parts.entries()) {
                if (!part.functionCall) continue;

                toolCalls.push({
                    id: `${part.functionCall.name}-${index}-${Date.now()}`,
                    name: part.functionCall.name,
                    arguments: part.functionCall.args ?? {}
                });
            }

            return {
                content: parts
                    .filter(part => part.text)
                    .map(part => part.text ?? "")
                    .join("\n")
                    .trim(),
                toolCalls,
                usage: normaliseUsage(data.usageMetadata
                    ? {
                        inputTokens: data.usageMetadata.promptTokenCount ?? 0,
                        outputTokens: data.usageMetadata.candidatesTokenCount ?? 0
                    }
                    : undefined
                )
            };
        }
    };
}

export function createChatClient(settings: AiSettings): ChatClient {
    if (settings.provider == "anthropic") {
        return createAnthropicClient(settings);
    }

    if (settings.provider == "google") {
        return createGeminiClient(settings);
    }

    return createOpenAiClient(settings);
}
