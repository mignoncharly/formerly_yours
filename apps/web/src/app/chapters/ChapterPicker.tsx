"use client";

import * as React from "react";
import { linkListingToChapter } from "./actions";

// §6.2 — "Where should this money go?" Link a listing to one of your chapters.
export function ChapterPicker({
  listingId,
  chapters,
  currentChapterId,
}: {
  listingId: string;
  chapters: { id: string; title: string }[];
  currentChapterId: string | null;
}) {
  const [value, setValue] = React.useState(currentChapterId ?? "");
  const [pending, startTransition] = React.useTransition();

  function onChange(next: string) {
    setValue(next);
    startTransition(async () => {
      await linkListingToChapter(listingId, next || null);
    });
  }

  return (
    <select
      aria-label="Fund a chapter"
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-muted)] outline-none"
    >
      <option value="">Fund a chapter…</option>
      {chapters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      ))}
    </select>
  );
}
