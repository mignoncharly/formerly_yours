"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedItem } from "@owy/types";
import {
  CATEGORIES,
  CONDITIONS,
  RELATIONSHIP_CONTEXTS,
  formatMoney,
} from "@/lib/reference";
import { track } from "@/lib/analytics";
import { ReactionBar } from "./ReactionBar";

/**
 * A single "story commerce" card used as the landing page's example.
 * Fires story_viewed (on first view), story_expanded, and fake_buy_clicked.
 */
export function ExampleStoryCard({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const [bought, setBought] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const viewed = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !viewed.current) {
            viewed.current = true;
            track("story_viewed", { itemId: item.id, placement: "landing" });
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [item.id]);

  const nc = item.nextChapter;
  const pct = nc
    ? Math.min(100, Math.round((nc.raised.amountMinor / nc.target.amountMinor) * 100))
    : 0;

  return (
    <div ref={ref} className="owy-card overflow-hidden">
      {/* Photo stand-in */}
      <div
        className="relative flex h-56 items-center justify-center text-7xl"
        style={{
          background: `radial-gradient(120% 120% at 30% 20%, ${item.accent}44, transparent 60%), linear-gradient(160deg, ${item.accent}22, #0000)`,
        }}
      >
        <span aria-hidden>{item.photo}</span>
        <span className="owy-chip absolute left-3 top-3">
          {RELATIONSHIP_CONTEXTS[item.story.contexts[0]!].emoji}{" "}
          {RELATIONSHIP_CONTEXTS[item.story.contexts[0]!].label}
        </span>
        <span className="owy-chip absolute right-3 top-3">
          {formatMoney(item.price.amountMinor, item.price.currency)}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              {item.title}
            </h3>
            <p className="text-xs text-[var(--color-faint)]">
              {CATEGORIES[item.category]} · {CONDITIONS[item.condition]} ·{" "}
              {item.story.visibility === "anonymous"
                ? "Anonymous seller"
                : `${item.seller.name} · ${item.seller.city}`}
            </p>
          </div>
        </div>

        <p className="mt-3 font-[family-name:var(--font-display)] text-lg italic text-[var(--color-paper)]">
          “{item.story.headline}”
        </p>
        <p
          className="mt-1 text-sm text-[var(--color-muted)]"
          style={
            expanded
              ? undefined
              : {
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
          }
        >
          {item.story.body}
        </p>

        {!expanded && (
          <button
            className="mt-1 text-sm font-semibold"
            style={{ color: "var(--color-primary-2)" }}
            onClick={() => {
              setExpanded(true);
              track("story_expanded", { itemId: item.id, placement: "landing" });
            }}
          >
            Read the full story
          </button>
        )}

        <div className="mt-4">
          <ReactionBar itemId={item.id} initial={item.reactions} />
        </div>

        {nc && (
          <div className="mt-4 rounded-xl border border-[var(--color-line)] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                {nc.emoji} {nc.title}
              </span>
              <span className="text-[var(--color-chapter)]">
                {formatMoney(nc.raised.amountMinor)} /{" "}
                {formatMoney(nc.target.amountMinor)}
              </span>
            </div>
            <div className="owy-progress mt-2">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            className="owy-btn owy-btn-primary flex-1"
            disabled={bought}
            onClick={() => {
              setBought(true);
              track("fake_buy_clicked", { itemId: item.id, placement: "landing" });
            }}
          >
            {bought ? "Interest noted 💌" : "I'm interested"}
          </button>
        </div>
        {bought && (
          <p className="mt-2 text-center text-xs text-[var(--color-faint)]">
            This is a preview — nothing was purchased.
          </p>
        )}
      </div>
    </div>
  );
}
