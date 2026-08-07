"use client";

import * as React from "react";
import type { Story, StoryMode, IdentityVisibility } from "@owy/database/types";
import type { AiStoryAction } from "@owy/validation";
import { Button, Card } from "@/components/ui";
import {
  publishStory,
  saveStory,
  setStoryContexts,
  polishStoryAction,
} from "./actions";

type Ctx = { id: number; slug: string; label: string; emoji: string | null; is_sensitive: boolean };

const MODES: { value: StoryMode; label: string; hint: string }[] = [
  { value: "clean_break", label: "Clean break", hint: "Just the facts, no drama." },
  { value: "little_tea", label: "A little tea", hint: "A hint of the backstory." },
  { value: "full_story", label: "Full story", hint: "The whole thing." },
];

const VISIBILITY: { value: IdentityVisibility; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Shown with your profile." },
  { value: "limited", label: "Limited", hint: "Minimal identity." },
  { value: "anonymous", label: "Anonymous", hint: "No identity shown." },
];

const AI_ACTIONS: { value: AiStoryAction; label: string }[] = [
  { value: "shorter", label: "Make it shorter" },
  { value: "witty", label: "Make it witty" },
  { value: "classy", label: "Make it classy" },
  { value: "playful", label: "Make it playful" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[var(--color-paper)] outline-none placeholder:text-[color-mix(in_oklab,var(--color-muted)_70%,transparent)] focus:border-[color-mix(in_oklab,var(--color-paper)_45%,transparent)]";

export function StoryEditor({
  story,
  listingTitle,
  contexts,
  selectedContextIds,
  aiEnabled,
}: {
  story: Story;
  listingTitle: string | null;
  contexts: Ctx[];
  selectedContextIds: number[];
  aiEnabled: boolean;
}) {
  const [headline, setHeadline] = React.useState(story.headline ?? "");
  const [body, setBody] = React.useState(story.body ?? "");
  // The user's own words, kept apart from any AI-polished body (§4.3/§4.4).
  const [originalInput, setOriginalInput] = React.useState(
    story.original_input ?? story.body ?? "",
  );
  const [aiAssisted, setAiAssisted] = React.useState(story.ai_assisted);
  const [mode, setMode] = React.useState<StoryMode>(story.mode);
  const [visibility, setVisibility] = React.useState<IdentityVisibility>(story.visibility);
  const [selected, setSelected] = React.useState<number[]>(selectedContextIds);

  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function onBodyChange(value: string) {
    setBody(value);
    // Editing by hand re-establishes "your words".
    setOriginalInput(value);
    setAiAssisted(false);
  }

  function toggleContext(id: number) {
    setSelected((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 3
          ? prev
          : [...prev, id];
      void setStoryContexts(story.id, next);
      return next;
    });
  }

  async function applyAi(action: AiStoryAction) {
    setError(null);
    setBusy(action);
    const res = await polishStoryAction(originalInput || body, action);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBody(res.text);
    setAiAssisted(true);
    void saveStory(story.id, { body: res.text });
  }

  function revertToMyWords() {
    setBody(originalInput);
    setAiAssisted(false);
    void saveStory(story.id, { body: originalInput });
  }

  async function onPublish() {
    setError(null);
    setBusy("publish");
    const res = await publishStory({
      storyId: story.id,
      headline,
      body,
      originalInput: originalInput || body,
      mode,
      visibility,
      contextIds: selected,
      aiAssisted,
    });
    if (res && !res.ok) {
      setBusy(null);
      setError(res.error);
    }
    // On success the action redirects to the story page.
  }

  const canPublish = body.trim().length >= 10;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-5 py-8">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
          Tell the story
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Why is <span className="text-[var(--color-paper)]">{listingTitle || "this object"}</span> leaving?
          Tell your story. Never expose theirs.
        </p>
      </div>

      {/* Contexts */}
      <Card className="mb-4 p-5">
        <h2 className="mb-1 text-[var(--color-paper)]">What happened?</h2>
        <p className="mb-3 text-sm text-[var(--color-muted)]">Pick up to 3.</p>
        <div className="flex flex-wrap gap-2">
          {contexts.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleContext(c.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  on
                    ? "border-[var(--color-primary)] text-[var(--color-paper)]"
                    : "border-[var(--color-line)] text-[var(--color-muted)]"
                }`}
              >
                {c.emoji ? `${c.emoji} ` : ""}
                {c.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Mode + visibility */}
      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-[var(--color-paper)]">Tone &amp; identity</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">Story mode</legend>
            <div className="flex flex-col gap-2">
              {MODES.map((m) => (
                <label key={m.value} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === m.value}
                    onChange={() => {
                      setMode(m.value);
                      void saveStory(story.id, { mode: m.value });
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-[var(--color-paper)]">{m.label}</span>
                    <span className="block text-xs text-[var(--color-muted)]">{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">Identity</legend>
            <div className="flex flex-col gap-2">
              {VISIBILITY.map((v) => (
                <label key={v.value} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === v.value}
                    onChange={() => {
                      setVisibility(v.value);
                      void saveStory(story.id, { visibility: v.value });
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-[var(--color-paper)]">{v.label}</span>
                    <span className="block text-xs text-[var(--color-muted)]">{v.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      {/* Write */}
      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-[var(--color-paper)]">Your story</h2>
        <input
          className={`${inputClass} mb-3`}
          placeholder="Headline (optional)"
          value={headline}
          maxLength={120}
          onChange={(e) => setHeadline(e.target.value)}
          onBlur={() => saveStory(story.id, { headline })}
        />
        <textarea
          className={`${inputClass} min-h-40 resize-y`}
          placeholder="Tell it in your own words. Facts only — never anyone else's private details."
          value={body}
          maxLength={4000}
          onChange={(e) => onBodyChange(e.target.value)}
          onBlur={() => saveStory(story.id, { body })}
        />

        {aiEnabled ? (
          <div className="mt-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
              AI assistant — rephrases your words, never invents
            </p>
            <div className="flex flex-wrap gap-2">
              {AI_ACTIONS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => applyAi(a.value)}
                  disabled={busy !== null || body.trim().length < 10}
                  className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-paper)] disabled:opacity-50"
                >
                  {busy === a.value ? "…" : a.label}
                </button>
              ))}
              {aiAssisted && (
                <button
                  type="button"
                  onClick={revertToMyWords}
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-muted)] underline underline-offset-4"
                >
                  Keep my words
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      {error && (
        <p role="alert" className="mb-4 text-sm text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-muted)]">
          {aiAssisted ? "AI-assisted · your words kept for reference" : "Your words"}
        </span>
        <Button type="button" onClick={onPublish} disabled={!canPublish || busy !== null}>
          {busy === "publish" ? "Publishing…" : "Publish story"}
        </Button>
      </div>
    </main>
  );
}
