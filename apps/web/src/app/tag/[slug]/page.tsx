import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServiceSupabaseClient } from "@owy/database/server";
import { getSignedThumbnails } from "@/lib/listing-images";
import { FeedCard, type FeedStory } from "@/components/feed/FeedCard";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function loadContext(slug: string) {
  const admin = createServiceSupabaseClient();
  const { data } = await admin
    .from("relationship_contexts")
    .select("id, slug, label, emoji")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await loadContext(slug);
  if (!ctx) return { title: "Not found" };
  const title = `${ctx.label} — stories on Once Was Yours`;
  const description = `Objects with a "${ctx.label}" story. Sell the past, fund what's next.`;
  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/tag/${ctx.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadContext(slug);
  if (!ctx) notFound();

  const admin = createServiceSupabaseClient();
  const { data: tagRows } = await admin
    .from("story_relationship_contexts")
    .select("story_id")
    .eq("context_id", ctx.id);
  const storyIds = (tagRows ?? []).map((r) => r.story_id);

  const { data: stories } = storyIds.length
    ? await admin
        .from("stories")
        .select("id, short_id, headline, body, listing_id")
        .in("id", storyIds)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(48)
    : { data: [] };

  const listingIds = [...new Set((stories ?? []).map((s) => s.listing_id))];
  const { data: listings } = listingIds.length
    ? await admin
        .from("listings")
        .select("id, short_id, title, price_amount, currency")
        .in("id", listingIds)
    : { data: [] };
  const byId = new Map((listings ?? []).map((l) => [l.id, l]));
  const thumbs = await getSignedThumbnails(listingIds);

  const cards: (FeedStory & { key: string; listingId: string })[] = (stories ?? [])
    .map((s) => {
      const l = byId.get(s.listing_id);
      if (!l) return null;
      return {
        key: s.id,
        listingId: s.listing_id,
        story_short_id: s.short_id,
        headline: s.headline,
        body: s.body,
        listing_short_id: l.short_id,
        listing_title: l.title,
        price_amount: l.price_amount,
        currency: l.currency,
        reaction_count: 0,
        comment_count: 0,
      };
    })
    .filter((x): x is FeedStory & { key: string; listingId: string } => x !== null);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-8">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        {ctx.emoji ? `${ctx.emoji} ` : ""}
        {ctx.label}
      </h1>
      {cards.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          No stories here yet.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {cards.map((c) => (
            <FeedCard key={c.key} story={c} thumbnail={thumbs.get(c.listingId)} />
          ))}
        </div>
      )}
    </main>
  );
}
