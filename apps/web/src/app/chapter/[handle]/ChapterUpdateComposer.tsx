"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { addChapterUpdate } from "@/app/chapters/actions";

export function ChapterUpdateComposer({ chapterId }: { chapterId: string }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (body.trim().length < 3) return;
    setBusy(true);
    setError(null);
    const res = await addChapterUpdate(chapterId, body.trim());
    setBusy(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mt-4">
      <textarea
        className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-paper)] outline-none"
        placeholder="What happened next? Share an update…"
        value={body}
        maxLength={2000}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && (
        <p className="mt-1 text-xs text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">{error}</p>
      )}
      <div className="mt-2">
        <Button type="button" onClick={submit} disabled={busy || body.trim().length < 3}>
          {busy ? "Posting…" : "Post update"}
        </Button>
      </div>
    </div>
  );
}
