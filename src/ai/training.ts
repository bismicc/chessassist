import { createChatClient } from "./client";
import { getGlossaryPrompt } from "../lib/tactics";
import { AiSettings, Usage } from "./types";

interface TrainingCompletion {
    content: string;
    usage?: Usage;
}

async function complete(
    settings: AiSettings,
    system: string,
    prompt: string,
    signal?: AbortSignal
): Promise<TrainingCompletion> {
    const client = createChatClient(settings);
    const result = await client.complete(
        [
            { role: "system", content: system },
            { role: "user", content: prompt }
        ],
        [],
        signal,
        { temperature: 0.3 }
    );

    return {
        content: result.content.trim(),
        usage: result.usage
    };
}

const trainingRules = `You are Chessassist's training director.
- Base every claim on the supplied facts. Never invent games, moves, evaluations or statistics.
- Use standard SAN for moves.
- Be concise and practical. Prefer one clear action over a list of vague advice.
- Name the tactical motif precisely and use the glossary definitions.
- Do not promise rating gains or diagnose a permanent weakness from a tiny sample.
- If the sample is small, say so.
- Use short paragraphs, not tables.
- Wrap replayable lines in double brackets with a ply, for example [[ply:0 e4 e5]].`;

export function generateOpeningLesson(
    settings: AiSettings, facts: string, signal?: AbortSignal
) {
    return complete(
        settings,
        `${trainingRules}

${getGlossaryPrompt()}

Write an opening weaknesses lesson with exactly these sections:
### Where you are weakest
### Why it breaks
### What to learn
### Your next games
Keep it under 450 words. Rank the weakest openings by score, not by name. Use the supplied lines, statistics and book moves. Distinguish mainline theory from your own small sample. Do not give generic opening plans; teach the specific line where the player is losing.`,
        `Find the opening weaknesses in these facts.\n\n${facts}`,
        signal
    );
}

export function generateWeaknessReview(
    settings: AiSettings, facts: string, signal?: AbortSignal
) {
    return complete(
        settings,
        `${trainingRules}

${getGlossaryPrompt()}

Write a weakness review with exactly these sections:
### What the data says
### The pattern to fix
### This week's drill
Keep it under 350 words. Mention sample size when it is small. Do not invent a motif that is not in the facts.
Imported games are opening data only. Never describe them as analysed or use them as weakness evidence. If the imported count is much larger than the analysed count, say that only analysed games inform the weakness profile.`,
        `Review this training profile.\n\n${facts}`,
        signal
    );
}


