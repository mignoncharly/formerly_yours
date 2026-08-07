import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { getSignedThumbnails } from "@/lib/listing-images";
import { FeedCard } from "@/components/feed/FeedCard";
import { FeedImpression } from "@/components/feed/FeedImpression";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Feed",
  description: "Objects, their stories, and the new chapters they fund.",
};

const PAGE_SIZE = 30;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = tabRaw === "following" ? "following" : "for-you";

  const user = await getSessionUser();
  const supabase = await createClient();

  const { data: rows } = await supabase.rpc("feed_stories", {
    viewer: user?.id ?? null,
    following_only: tab === "following",
    lim: PAGE_SIZE,
    off: 0,
  });

  let stories = rows ?? [];
  if (user) {
    const { data: bl } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    const blocked = new Set((bl ?? []).map((b) => b.blocked_id));
    if (blocked.size > 0) stories = stories.filter((s) => !blocked.has(s.author_id));
  }
  const thumbs = await getSignedThumbnails(stories.map((s) => s.listing_id));

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm ${
      active
        ? "text-[var(--color-paper)] border-b-2 border-[var(--color-primary)]"
        : "text-[var(--color-muted)]"
    }`;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-6 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
          Feed
        </h1>
        <Link href="/sell" className="text-sm text-[var(--color-muted)] underline underline-offset-4">
          Sell →
        </Link>
      </div>

      <div className="mb-5 flex gap-2 border-b border-[var(--color-line)]">
        <Link href="/feed" className={tabClass(tab === "for-you")}>
          For you
        </Link>
        <Link href="/feed?tab=following" className={tabClass(tab === "following")}>
          Following
        </Link>
      </div>

      {tab === "following" && !user ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          <Link href="/sign-in?next=/feed?tab=following" className="underline underline-offset-4">
            Sign in
          </Link>{" "}
          to see stories from people you follow.
        </p>
      ) : stories.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          {tab === "following"
            ? "Follow a few storytellers to fill this up."
            : "No stories yet. Be the first to tell one."}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {stories.map((s) => (
            <FeedImpression key={s.story_id} storyId={s.story_id}>
              <FeedCard story={s} thumbnail={thumbs.get(s.listing_id)} />
            </FeedImpression>
          ))}
        </div>
      )}
      <BottomNav />
    </main>
  );
}
