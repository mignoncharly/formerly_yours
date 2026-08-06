"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FeedItem } from "@owy/types";
import {
  CATEGORIES,
  CONDITIONS,
  RELATIONSHIP_CONTEXTS,
  STORY_MODES,
  formatMoney,
} from "@/lib/reference";
import { track } from "@/lib/analytics";
import { ReactionBar } from "@/components/ReactionBar";
import { Logo } from "@/components/Logo";

export function FeedClient({ items }: { items: FeedItem[] }) {
  useEffect(() => {
    track("feed_opened", { count: items.length });
  }, [items.length]);

  return (
    <div className="relative bg-[var(--color-ink)]">
      {/* Overlay top bar */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <div className="owy-container flex h-14 items-center justify-between">
          <Link href="/" className="pointer-events-auto">
            <Logo className="text-sm" />
          </Link>
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="owy-chip">Preview · fictional stories</span>
            <a href="/#waitlist" className="owy-btn owy-btn-primary !px-3 !py-1.5 text-xs">
              Join
            </a>
          </div>
        </div>
      </div>

      <div className="owy-feed">
        {items.map((item, i) => (
          <FeedSlide key={item.id} item={item} index={i} />
        ))}

        {/* Closing slide */}
        <section className="owy-slide grid place-items-center">
          <div className="owy-container max-w-md text-center">
            <div className="text-5xl">🌱</div>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl">
              That&apos;s the idea.
            </h2>
            <p className="mt-3 text-[var(--color-muted)]">
              Real people, real objects, real new chapters. Want in when we open?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <a href="/#waitlist" className="owy-btn owy-btn-primary">
                Join the waitlist
              </a>
              <Link href="/" className="owy-btn owy-btn-ghost">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeedSlide({ item, index }: { item: FeedItem; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const viewed = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [interested, setInterested] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !viewed.current) {
            viewed.current = true;
            track("feed_item_viewed", { itemId: item.id, index });
            track("story_viewed", { itemId: item.id, placement: "feed" });
          }
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [item.id, index]);

  async function onShare() {
    setShared(true);
    track("story_shared", { itemId: item.id });
    const shareData = {
      title: "Once Was Yours",
      text: `“${item.story.headline}” — ${item.title}`,
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/feed`
          : "https://once-was-yours",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    } catch {
      /* user cancelled share — fine */
    }
  }

  const ctx = item.story.contexts[0]!;
  const nc = item.nextChapter;
  const pct = nc
    ? Math.min(100, Math.round((nc.raised.amountMinor / nc.target.amountMinor) * 100))
    : 0;

  return (
    <section
      ref={ref}
      className="owy-slide relative flex flex-col justify-end overflow-hidden"
    >
      {/* Full-bleed "photo" */}
      <div
        aria-hidden
        className="absolute inset-0 grid place-items-center"
        style={{
          background: `radial-gradient(90% 60% at 50% 20%, ${item.accent}55, transparent 60%), linear-gradient(180deg, ${item.accent}22 0%, var(--color-ink) 78%)`,
        }}
      >
        <span className="text-[9rem] opacity-90 drop-shadow-2xl">{item.photo}</span>
      </div>

      {/* Right rail: reactions summary + share */}
      <div className="absolute bottom-40 right-3 z-20 flex flex-col items-center gap-3 sm:bottom-28">
        <button
          onClick={onShare}
          className="grid h-12 w-12 place-items-center rounded-full border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-ink)_70%,transparent)] text-xl backdrop-blur"
          aria-label="Share"
        >
          {shared ? "✅" : "↗"}
        </button>
        {item.pastSold && (
          <span className="owy-chip !bg-[color-mix(in_oklab,var(--color-chapter)_18%,transparent)]">
            Past Sold ✓
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full bg-[linear-gradient(180deg,transparent,var(--color-ink)_45%)] px-4 pb-8 pt-24">
        <div className="owy-container max-w-2xl">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="owy-chip">
              {RELATIONSHIP_CONTEXTS[ctx].emoji} {RELATIONSHIP_CONTEXTS[ctx].label}
            </span>
            <span className="owy-chip">
              {STORY_MODES[item.story.mode].emoji} {STORY_MODES[item.story.mode].label}
            </span>
            {item.story.visibility === "anonymous" && (
              <span className="owy-chip">🕶️ Anonymous</span>
            )}
          </div>

          <div className="flex items-end justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
              {item.title}
            </h2>
            <span className="whitespace-nowrap text-xl font-semibold">
              {formatMoney(item.price.amountMinor, item.price.currency)}
            </span>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            {CATEGORIES[item.category]} · {CONDITIONS[item.condition]} ·{" "}
            {item.story.visibility === "anonymous"
              ? "Anonymous seller"
              : `${item.seller.name} · ${item.seller.city}${item.seller.verified ? " · ✓ verified" : ""}`}
          </p>

          <p className="mt-3 font-[family-name:var(--font-display)] text-lg italic">
            “{item.story.headline}”
          </p>
          <p
            className="mt-1 text-sm text-[var(--color-muted)]"
            style={
              expanded
                ? undefined
                : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }
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
                track("story_expanded", { itemId: item.id, placement: "feed" });
              }}
            >
              more
            </button>
          )}

          <div className="mt-3">
            <ReactionBar itemId={item.id} initial={item.reactions} size="sm" />
          </div>

          {nc && (
            <button
              className="mt-3 block w-full rounded-xl border border-[var(--color-line)] p-3 text-left"
              onClick={() => track("next_chapter_viewed", { itemId: item.id })}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">
                  {nc.emoji} {nc.title}
                </span>
                <span className="text-[var(--color-chapter)]">
                  {formatMoney(nc.raised.amountMinor)} / {formatMoney(nc.target.amountMinor)}
                </span>
              </div>
              <div className="owy-progress mt-2">
                <span style={{ width: `${pct}%` }} />
              </div>
            </button>
          )}

          <div className="mt-4 flex gap-2">
            <button
              className="owy-btn owy-btn-primary flex-1"
              disabled={interested}
              onClick={() => {
                setInterested(true);
                track("fake_buy_clicked", { itemId: item.id, placement: "feed" });
              }}
            >
              {interested ? "Interest noted 💌" : "I'm interested"}
            </button>
            <button
              className="owy-btn owy-btn-ghost"
              onClick={() => track("make_offer_clicked", { itemId: item.id })}
            >
              Make an offer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
