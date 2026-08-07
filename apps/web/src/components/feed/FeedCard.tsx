import Link from "next/link";
import { Card } from "@/components/ui";
import { formatMinorPrice, listingPath, storyPath } from "@/lib/listings";

export type FeedStory = {
  story_short_id: string;
  headline: string | null;
  body: string | null;
  listing_short_id: string;
  listing_title: string | null;
  price_amount: number | null;
  currency: string;
  reaction_count: number;
  comment_count: number;
};

// §5.4 — a feed card carries enough to understand the story without opening ten
// screens: photo, title/price, story preview, engagement, and a way in.
export function FeedCard({
  story,
  thumbnail,
}: {
  story: FeedStory;
  thumbnail?: string;
}) {
  const href = storyPath(story.story_short_id, story.listing_title);
  const preview = (story.body ?? "").slice(0, 180);

  return (
    <Card className="overflow-hidden p-0">
      <Link href={href} className="block">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={story.listing_title ?? ""}
            loading="lazy"
            decoding="async"
            className="h-64 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-[var(--color-muted)]">
            No photo
          </div>
        )}
      </Link>

      <div className="p-4">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <Link href={href} className="text-[var(--color-paper)] hover:underline">
            {story.headline?.trim() || story.listing_title || "A story"}
          </Link>
          <span className="whitespace-nowrap text-sm text-[var(--color-paper)]">
            {formatMinorPrice(story.price_amount, story.currency)}
          </span>
        </div>

        {preview && (
          <p className="text-sm text-[var(--color-muted)]">
            {preview}
            {(story.body?.length ?? 0) > 180 ? "…" : ""}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-muted)]">
          <span>❤ {story.reaction_count}</span>
          <span>💬 {story.comment_count}</span>
          <Link
            href={listingPath({ title: story.listing_title, short_id: story.listing_short_id })}
            className="ml-auto underline underline-offset-4 hover:text-[var(--color-paper)]"
          >
            View item →
          </Link>
        </div>
      </div>
    </Card>
  );
}
