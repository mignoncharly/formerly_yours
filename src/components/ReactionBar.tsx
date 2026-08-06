"use client";

import { useState } from "react";
import { REACTIONS } from "@/lib/reference";
import type { ReactionKey } from "@/lib/types";
import { track } from "@/lib/analytics";

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

export function ReactionBar({
  itemId,
  initial,
  size = "md",
}: {
  itemId: string;
  initial: Record<ReactionKey, number>;
  size?: "sm" | "md";
}) {
  const [counts, setCounts] = useState(initial);
  const [mine, setMine] = useState<ReactionKey | null>(null);
  const [bump, setBump] = useState<ReactionKey | null>(null);

  function react(key: ReactionKey) {
    setCounts((prev) => {
      const next = { ...prev };
      if (mine === key) {
        next[key] = Math.max(0, next[key] - 1);
        return next;
      }
      if (mine) next[mine] = Math.max(0, next[mine] - 1);
      next[key] = next[key] + 1;
      return next;
    });
    const toggledOff = mine === key;
    setMine(toggledOff ? null : key);
    if (!toggledOff) {
      setBump(key);
      setTimeout(() => setBump(null), 350);
      track("story_reacted", { itemId, reaction: key });
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map((rx) => {
        const active = mine === rx.key;
        return (
          <button
            key={rx.key}
            onClick={() => react(rx.key)}
            aria-pressed={active}
            aria-label={rx.label}
            className={`fy-chip ${size === "sm" ? "!px-2 !py-1 !text-xs" : ""}`}
            style={{
              borderColor: active ? "var(--color-primary)" : "var(--color-line)",
              color: active ? "var(--color-paper)" : "var(--color-muted)",
              background: active
                ? "color-mix(in oklab, var(--color-primary) 16%, transparent)"
                : undefined,
            }}
          >
            <span className={bump === rx.key ? "fy-pop" : ""}>{rx.emoji}</span>
            <span>{compact(counts[rx.key])}</span>
          </button>
        );
      })}
    </div>
  );
}
