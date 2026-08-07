import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { getSessionUser } from "@/lib/auth";
import {
  CONDITION_LABELS,
  formatMinorPrice,
  listingPath,
  shortIdFromHandle,
} from "@/lib/listings";
import { StoryReactions } from "./StoryReactions";

async function loadStory(handle: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("short_id", shortIdFromHandle(handle))
    .not("published_at", "is", null)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const story = await loadStory(handle);
  if (!story) return { title: "Story not found" };
  return {
    title: story.headline ?? "A story on Once Was Yours",
    description: story.body?.slice(0, 160) ?? undefined,
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const story = await loadStory(handle);
  if (!story) notFound();

  const supabase = await createClient();
  const admin = createServiceSupabaseClient();

  const [{ data: tagRows }, reactionRows, user, { data: listing }] = await Promise.all([
    supabase
      .from("story_relationship_contexts")
      .select("context_id")
      .eq("story_id", story.id),
    supabase.rpc("story_reaction_counts", { in_story: story.id }),
    getSessionUser(),
    // Item info shown alongside the story — public even if the listing paused.
    admin
      .from("listings")
      .select("title, short_id, price_amount, currency, condition")
      .eq("id", story.listing_id)
      .maybeSingle(),
  ]);

  const ctxIds = (tagRows ?? []).map((r) => r.context_id);
  const { data: tagList } = ctxIds.length
    ? await supabase
        .from("relationship_contexts")
        .select("label, emoji")
        .in("id", ctxIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const counts: Record<string, number> = {};
  for (const r of reactionRows.data ?? []) counts[r.reaction] = Number(r.count);

  let mine = null as string | null;
  if (user) {
    const { data: mineRow } = await supabase
      .from("story_reactions")
      .select("reaction")
      .eq("story_id", story.id)
      .eq("user_id", user.id)
      .maybeSingle();
    mine = mineRow?.reaction ?? null;
  }

  // Hero image (first listing photo), signed for public display.
  let heroUrl = "";
  const { data: img } = await admin
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", story.listing_id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (img) {
    const { data } = await admin.storage
      .from("listing-images")
      .createSignedUrl(img.storage_path, 60 * 60);
    heroUrl = data?.signedUrl ?? "";
  }

  // Seller identity respects the story's visibility (§4.2).
  let sellerLine = "Anonymous";
  if (story.visibility !== "anonymous") {
    const { data: seller } = await admin
      .from("profiles")
      .select("username, display_name")
      .eq("id", story.author_id)
      .maybeSingle();
    if (story.visibility === "public") {
      sellerLine = seller?.display_name?.trim() || seller?.username || "A seller";
    } else {
      sellerLine = "A seller";
    }
  }

  const tags = tagList ?? [];
  const itemHandle = listing ? listingPath({ title: listing.title, short_id: listing.short_id }) : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8">
      {heroUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroUrl}
          alt={listing?.title ?? ""}
          className="mb-6 max-h-96 w-full rounded-xl border border-[var(--color-line)] object-cover"
        />
      ) : null}

      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <span
              key={i}
              className="rounded-full border border-[var(--color-line)] px-3 py-1 text-sm text-[var(--color-muted)]"
            >
              {t.emoji ? `${t.emoji} ` : ""}
              {t.label}
            </span>
          ))}
        </div>
      )}

      {story.headline && (
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
          {story.headline}
        </h1>
      )}

      {story.body && (
        <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-[var(--color-paper)]">
          {story.body}
        </p>
      )}

      <div className="mt-5">
        <StoryReactions
          storyId={story.id}
          initialCounts={counts}
          initialMine={mine as never}
          signedIn={!!user}
          next={`/story/${handle}`}
        />
      </div>

      {/* The object */}
      {listing && itemHandle && (
        <Link href={itemHandle} className="mt-8 block">
          <div className="flex items-center justify-between rounded-xl border border-[var(--color-line)] p-4 hover:border-[color-mix(in_oklab,var(--color-paper)_30%,var(--color-line))]">
            <div>
              <p className="text-[var(--color-paper)]">{listing.title}</p>
              <p className="text-sm text-[var(--color-muted)]">
                {listing.condition ? CONDITION_LABELS[listing.condition] : ""} · Sold by {sellerLine}
              </p>
            </div>
            <div className="whitespace-nowrap text-lg text-[var(--color-paper)]">
              {formatMinorPrice(listing.price_amount, listing.currency)}
            </div>
          </div>
        </Link>
      )}

      {/* Comments arrive next (§4.7). */}
      <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
        Comments are coming soon.
      </p>
    </main>
  );
}
