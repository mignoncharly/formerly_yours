"use client";

import * as React from "react";
import { parsePriceToMinor } from "@owy/validation";
import type { IdentityVisibility } from "@owy/database/types";
import { Button } from "@/components/ui";
import { createChapter } from "./actions";

const TEMPLATES: { title: string }[] = [
  { title: "Solo Trip" },
  { title: "New Home" },
  { title: "Fresh Start" },
  { title: "Study" },
  { title: "Start a Business" },
  { title: "Savings" },
  { title: "Something New" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[var(--color-paper)] outline-none placeholder:text-[color-mix(in_oklab,var(--color-muted)_70%,transparent)] focus:border-[color-mix(in_oklab,var(--color-paper)_45%,transparent)]";

export function NewChapterForm() {
  const [title, setTitle] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<IdentityVisibility>("public");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setError(null);
    if (title.trim().length < 2) {
      setError("Give your chapter a title.");
      return;
    }
    setBusy(true);
    const targetMinor = target.trim() ? parsePriceToMinor(target) ?? undefined : undefined;
    const res = await createChapter({ title, description, targetMinor, visibility });
    if (res && !res.ok) {
      setBusy(false);
      setError(res.error);
    }
    // success redirects to the chapter page
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.title}
            type="button"
            onClick={() => setTitle(t.title)}
            className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-paper)]"
          >
            {t.title}
          </button>
        ))}
      </div>

      <input
        className={inputClass}
        placeholder="Chapter title, e.g. First solo trip"
        value={title}
        maxLength={80}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <span className="text-lg text-[var(--color-muted)]">€</span>
        <input
          className={inputClass}
          inputMode="decimal"
          placeholder="Target (optional), e.g. 1500"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </div>
      <textarea
        className={`${inputClass} min-h-20 resize-y`}
        placeholder="What is this for? (optional)"
        value={description}
        maxLength={1000}
        onChange={(e) => setDescription(e.target.value)}
      />
      <select
        className={inputClass}
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as IdentityVisibility)}
      >
        <option value="public">Public — anyone can see it</option>
        <option value="limited">Limited</option>
        <option value="anonymous">Anonymous</option>
      </select>

      {error && (
        <p role="alert" className="text-sm text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">
          {error}
        </p>
      )}
      <div>
        <Button type="button" onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Create chapter"}
        </Button>
      </div>
    </div>
  );
}
