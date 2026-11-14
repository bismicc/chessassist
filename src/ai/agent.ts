import {
    ChatClient, ChatMessage, ToolDefinition, Usage
} from "./types";
import { CoachContext, executeTool } from "./tools";
import { toolDefinitions } from "./toolDefinitions";

interface AgentOptions {
    client: ChatClient;
    context: CoachContext;
    messages: ChatMessage[];
    signal?: AbortSignal;
    maxSteps?: number;
    tools?: ToolDefinition[];
    thinking?: boolean;
    onTool?: (name: string, state: "start" | "done") => void;
}

export interface AgentResult {
    content: string;
    messages: ChatMessage[];
    usage: Usage;
}

export async function runAgent({
    client, context, messages, signal, maxSteps = 10,
    tools = toolDefinitions, thinking, onTool
}: AgentOptions): Promise<AgentResult> {
    const conversation = [ ...messages ];
    const usage: Usage = { inputTokens: 0, outputTokens: 0 };
    let content = "";

    for (let step = 0; step < maxSteps; step++) {
        const completion = await client.complete(
            conversation,
            tools,
            signal,
            { thinking }
        );

        if (completion.usage) {
            usage.inputTokens += completion.usage.inputTokens;
            usage.outputTokens += completion.usage.outputTokens;
        }

        if (!completion.toolCalls.length) {
            content = completion.content;
            break;
        }

        conversation.push({
            role: "assistant",
            content: completion.content,
            toolCalls: completion.toolCalls
        });

        for (const call of completion.toolCalls) {
            onTool?.(call.name, "start");
        }

        const results = await Promise.all(
            completion.toolCalls.map(call => executeTool(call, context, signal))
        );

        for (const [ index, result ] of results.entries()) {
            onTool?.(completion.toolCalls[index].name, "done");
            conversation.push({
                role: "tool",
                toolCallId: result.id,
                name: result.name,
                content: result.content
            });
        }

        content = completion.content;
    }

    if (!content.trim()) {
        const final = await client.complete(
            [
                ...conversation,
                {
                    role: "user",
                    content: "Answer the original question now using the tool results above. Do not call any more tools."
                }
            ],
            [],
            signal,
            { thinking: false }
        );

        if (final.usage) {
            usage.inputTokens += final.usage.inputTokens;
            usage.outputTokens += final.usage.outputTokens;
        }

        content = final.content;
    }

    return { content, messages: conversation, usage };
}
