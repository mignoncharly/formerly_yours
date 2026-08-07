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
import { StoryComments } from "./StoryComments";
import { StoryShare } from "./StoryShare";
import { FollowButton } from "./FollowButton";
import { ReportButton } from "@/components/ReportButton";
import { BlockButton } from "@/components/BlockButton";
import type { CommentView } from "./comment-actions";

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
  const title = story.headline ?? "A story on Once Was Yours";
  const description = story.body?.slice(0, 160) ?? undefined;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    title,
    description,
    alternates: { canonical: `${appUrl}/story/${handle}` },
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
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

  // Follow state (only meaningful when the author's identity is public).
  let isFollowing = false;
  if (user && story.visibility === "public" && user.id !== story.author_id) {
    const { data: f } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("followed_id", story.author_id)
      .maybeSingle();
    isFollowing = !!f;
  }

  // Blocked authors — hide their comments and offer block on the author.
  let blockedSet = new Set<string>();
  if (user) {
    const { data: bl } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    blockedSet = new Set((bl ?? []).map((b) => b.blocked_id));
  }
  const isBlocked = blockedSet.has(story.author_id);

  const tags = tagList ?? [];
  const itemHandle = listing ? listingPath({ title: listing.title, short_id: listing.short_id }) : null;

  // Comments (§4.7) — author names are public.
  const { data: commentRows } = await supabase
    .from("comments")
    .select("id, author_id, parent_comment_id, body, created_at, edited_at")
    .eq("story_id", story.id)
    .order("created_at", { ascending: true });
  const commentAuthorIds = [...new Set((commentRows ?? []).map((c) => c.author_id))];
  const { data: commentAuthors } = commentAuthorIds.length
    ? await admin.from("profiles").select("id, username, display_name").in("id", commentAuthorIds)
    : { data: [] };
  const nameById = new Map(
    (commentAuthors ?? []).map((a) => [a.id, a.display_name?.trim() || a.username || "Someone"]),
  );
  const initialComments: CommentView[] = (commentRows ?? [])
    .filter((c) => !blockedSet.has(c.author_id))
    .map((c) => ({
    id: c.id,
    body: c.body,
    parentCommentId: c.parent_comment_id,
    authorId: c.author_id,
    authorName: nameById.get(c.author_id) ?? "Someone",
    createdAt: c.created_at,
    editedAt: c.edited_at,
  }));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: story.headline ?? "A story on Once Was Yours",
            articleBody: story.body ?? undefined,
            image: heroUrl ? [heroUrl] : undefined,
          }),
        }}
      />
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

      <StoryShare title={story.headline ?? "A story on Once Was Yours"} />

      {story.visibility === "public" && (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-[var(--color-muted)]">
            By <span className="text-[var(--color-paper)]">{sellerLine}</span>
          </span>
          {user && user.id !== story.author_id && (
            <div className="flex items-center gap-3">
              <BlockButton
                blockedId={story.author_id}
                initialBlocked={isBlocked}
                signedIn={!!user}
                next={`/story/${handle}`}
              />
              <FollowButton
                followedId={story.author_id}
                initialFollowing={isFollowing}
                signedIn={!!user}
                next={`/story/${handle}`}
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <ReportButton
          target={{ storyId: story.id }}
          signedIn={!!user}
          next={`/story/${handle}`}
          label="Report this story"
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

      <StoryComments
        storyId={story.id}
        initialComments={initialComments}
        currentUserId={user?.id ?? null}
        signedIn={!!user}
        next={`/story/${handle}`}
      />
    </main>
  );
}
