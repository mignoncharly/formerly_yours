import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { AiStoryAction } from "@owy/validation";

// AI Story Assistant (implementation plan §4.3/§4.4). The user writes their own
// facts; the assistant only *rephrases* — it must NEVER invent events,
// accusations, names, or motives. The original input is always retained
// separately (stories.original_input) for audit/moderation.
//
// Gated on ANTHROPIC_API_KEY: with no key the feature is unavailable and the UI
// falls back to "keep my words". Model defaults to Opus 4.8 (do not downgrade
// for cost silently); override with OWY_AI_MODEL. No temperature/top_p — those
// are removed on Opus 4.8 and 400.

const MODEL = process.env.OWY_AI_MODEL || "claude-opus-4-8";

export function aiStoryConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You help a seller rewrite a short, first-person story about why they are selling a personal object on a marketplace called "Once Was Yours".

Absolute rules — never break these:
- Never invent events, accusations, infidelity, crimes, names, motives, dates, or details.
- Only transform information the user explicitly provided. Add nothing factual.
- Never expose third parties: do not add names, contact details, or identifying information about anyone.
- Keep it first person and true to the user's voice and facts.
- If the input is empty or too thin to rephrase, return it unchanged.

Return ONLY the rewritten story text — no preamble, no quotes, no commentary.`;

const ACTION_INSTRUCTION: Record<AiStoryAction, string> = {
  keep: "Return the story unchanged.",
  shorter: "Rewrite it to be noticeably shorter and tighter, keeping every fact.",
  witty: "Rewrite it with a lightly witty, self-aware tone. Do not add facts.",
  classy: "Rewrite it with a calm, classy, understated tone. Do not add facts.",
  playful: "Rewrite it with a warm, playful tone. Do not add facts.",
};

export async function polishStory(
  input: string,
  action: AiStoryAction,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const source = input.trim();
  if (action === "keep" || !source) return { ok: true, text: source };
  if (!aiStoryConfigured()) {
    return { ok: false, error: "AI assistant is not available right now." };
  }

  try {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024, // stories are short; deliberately capped
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${ACTION_INSTRUCTION[action]}\n\nStory:\n${source}`,
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return { ok: true, text: text || source };
  } catch {
    return { ok: false, error: "The assistant couldn't rewrite that. Keep your words." };
  }
}
