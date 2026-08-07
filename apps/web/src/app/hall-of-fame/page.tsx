import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedThumbnails } from "@/lib/listing-images";
import { FeedCard } from "@/components/feed/FeedCard";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Hall of Fame",
  description:
    "The best stories on Once Was Yours — the most savage goodbyes, the best new beginnings, and the plot twists nobody saw coming.",
};

// §11.3 — a curated, opt-in showcase. One ranked row per category.
const PER_CATEGORY = 8;

export default async function HallOfFamePage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("hall_of_fame_categories")
    .select("key, title, blurb")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const cats = categories ?? [];

  // Fetch each category's ranked stories in parallel.
  const results = await Promise.all(
    cats.map(async (c) => {
      const { data } = await supabase.rpc("hall_of_fame", {
        cat_key: c.key,
        lim: PER_CATEGORY,
      });
      return { category: c, stories: data ?? [] };
    }),
  );

  const populated = results.filter((r) => r.stories.length > 0);

  // Sign every referenced listing thumbnail in one batch.
  const listingIds = populated.flatMap((r) => r.stories.map((s) => s.listing_id));
  const thumbs = await getSignedThumbnails(listingIds);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-5 py-8 pb-24">
      <header className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-paper)]">
          Hall of Fame
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          The stories that stopped the scroll. Opt yours in from any story you&rsquo;ve told.
        </p>
      </header>

      {populated.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          No inductees yet. Tell a story worth remembering &mdash;{" "}
          <Link href="/sell" className="underline underline-offset-4">
            start selling
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-12">
          {populated.map(({ category, stories }) => (
            <section key={category.key}>
              <div className="mb-4">
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
                  {category.title}
                </h2>
                <p className="text-sm text-[var(--color-muted)]">{category.blurb}</p>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {stories.map((s) => (
                  <FeedCard
                    key={s.story_id}
                    story={{
                      story_short_id: s.story_short_id,
                      headline: s.headline,
                      body: s.body,
                      listing_short_id: s.listing_short_id,
                      listing_title: s.listing_title,
                      price_amount: s.price_amount,
                      currency: s.currency,
                      reaction_count: s.metric_count,
                      comment_count: 0,
                    }}
                    thumbnail={thumbs.get(s.listing_id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <BottomNav />
    </main>
  );
}
