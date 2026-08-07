"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { REACTIONS } from "@/lib/reference";
import type { ReactionType } from "@owy/database/types";
import { reactToStory } from "./actions";

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

export function StoryReactions({
  storyId,
  initialCounts,
  initialMine,
  signedIn,
  next,
}: {
  storyId: string;
  initialCounts: Record<string, number>;
  initialMine: ReactionType | null;
  signedIn: boolean;
  next: string;
}) {
  const router = useRouter();
  const [counts, setCounts] = React.useState(initialCounts);
  const [mine, setMine] = React.useState<ReactionType | null>(initialMine);
  const [pending, startTransition] = React.useTransition();

  function react(key: ReactionType) {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    const target = mine === key ? null : key;

    // Optimistic.
    setCounts((prev) => {
      const n = { ...prev };
      if (mine) n[mine] = Math.max(0, (n[mine] ?? 0) - 1);
      if (target) n[target] = (n[target] ?? 0) + 1;
      return n;
    });
    setMine(target);

    startTransition(async () => {
      const res = await reactToStory(storyId, target);
      if (res.ok) {
        setCounts(res.counts);
        setMine(res.mine);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map((rx) => {
        const active = mine === rx.key;
        return (
          <button
            key={rx.key}
            type="button"
            onClick={() => react(rx.key)}
            disabled={pending}
            aria-pressed={active}
            aria-label={rx.label}
            className="owy-chip"
            style={{
              borderColor: active ? "var(--color-primary)" : "var(--color-line)",
              color: active ? "var(--color-paper)" : "var(--color-muted)",
              background: active
                ? "color-mix(in oklab, var(--color-primary) 16%, transparent)"
                : undefined,
            }}
          >
            <span>{rx.emoji}</span>
            <span>{compact(counts[rx.key] ?? 0)}</span>
          </button>
        );
      })}
    </div>
  );
}
