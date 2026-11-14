import { AiProvider, AiProviderId } from "./types";

export const providers: AiProvider[] = [
    {
        id: "openrouter",
        name: "OpenRouter",
        baseUrl: "https://openrouter.ai/api/v1",
        requiresKey: true,
        browser: "likely",
        models: [
            { id: "anthropic/claude-sonnet-5.5", label: "Claude Sonnet 5.5" },
            { id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5" },
            { id: "openai/gpt-5.4", label: "GPT-5.4" },
            { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
            { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro" },
            { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
            { id: "x-ai/grok-4", label: "Grok 4" },
            { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" }
        ]
    },
    {
        id: "anthropic",
        name: "Anthropic",
        baseUrl: "https://api.anthropic.com",
        requiresKey: true,
        browser: "likely",
        models: [
            { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
            { id: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
            { id: "claude-opus-5-5", label: "Claude Opus 5.5" }
        ]
    },
    {
        id: "openai",
        name: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        requiresKey: true,
        browser: "unclear",
        models: [
            { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
            { id: "gpt-5.4", label: "GPT-5.4" },
            { id: "gpt-5.2", label: "GPT-5.2" },
            { id: "gpt-4.1", label: "GPT-4.1" }
        ]
    },
    {
        id: "google",
        name: "Google Gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        requiresKey: true,
        browser: "likely",
        models: [
            { id: "gemini-3-pro-preview", label: "Gemini 3 Pro" },
            { id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
            { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
        ]
    },
    {
        id: "deepseek",
        name: "DeepSeek",
        baseUrl: "https://api.deepseek.com/v1",
        requiresKey: true,
        browser: "unclear",
        models: [
            { id: "deepseek-flash", label: "DeepSeek V4 Flash" },
            { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" }
        ]
    },
    {
        id: "groq",
        name: "Groq",
        baseUrl: "https://api.groq.com/openai/v1",
        requiresKey: true,
        browser: "likely",
        models: [
            { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
            { id: "moonshotai/kimi-k2-instruct", label: "Kimi K2" }
        ]
    },
    {
        id: "mistral",
        name: "Mistral",
        baseUrl: "https://api.mistral.ai/v1",
        requiresKey: true,
        browser: "unclear",
        models: [
            { id: "mistral-large-latest", label: "Mistral Large" },
            { id: "mistral-medium-latest", label: "Mistral Medium" }
        ]
    },
    {
        id: "xai",
        name: "xAI",
        baseUrl: "https://api.x.ai/v1",
        requiresKey: true,
        browser: "unclear",
        models: [
            { id: "grok-4", label: "Grok 4" },
            { id: "grok-3-mini", label: "Grok 3 Mini" }
        ]
    },
    {
        id: "together",
        name: "Together AI",
        baseUrl: "https://api.together.xyz/v1",
        requiresKey: true,
        browser: "unclear",
        models: [
            { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B" },
            { id: "Qwen/Qwen3-235B-A22B", label: "Qwen3 235B" }
        ]
    },
    {
        id: "ollama",
        name: "Ollama (local)",
        baseUrl: "http://localhost:11434/v1",
        requiresKey: false,
        browser: "unclear",
        models: [
            { id: "llama3.3", label: "Llama 3.3" },
            { id: "qwen3:8b", label: "Qwen3 8B" },
            { id: "mistral", label: "Mistral" }
        ]
    },
    {
        id: "custom",
        name: "Custom OpenAI-compatible",
        baseUrl: "",
        requiresKey: false,
        browser: "unclear",
        models: []
    }
];

export function getProvider(id: AiProviderId) {
    return providers.find(provider => provider.id == id) ?? providers[0];
}

export const defaultProvider: AiProviderId = "openrouter";
export const defaultModel = "anthropic/claude-sonnet-5.5";

export function getDefaultModel(providerId: AiProviderId) {
    return getProvider(providerId).models[0]?.id ?? "";
}
