import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button, Card } from "@/components/ui";
import { formatMinorPrice, listingPath } from "@/lib/listings";
import { createDraft } from "./actions";
import { ChapterPicker } from "@/app/chapters/ChapterPicker";

export const metadata: Metadata = { title: "Sell" };

export default async function SellPage() {
  const profile = await requireOnboarded("/sell");
  const supabase = await createClient();

  // RLS also exposes everyone's *active* listings, so scope to this seller.
  const { data: listings } = await supabase
    .from("listings")
    .select("id, short_id, title, price_amount, currency, status, updated_at")
    .eq("seller_id", profile.id)
    .order("updated_at", { ascending: false });

  const drafts = (listings ?? []).filter((l) => l.status === "draft");
  const live = (listings ?? []).filter((l) => l.status !== "draft");

  // Chapters this seller can fund, and which listing funds which chapter (§6.2).
  const listingIds = (listings ?? []).map((l) => l.id);
  const [{ data: chapters }, { data: links }] = await Promise.all([
    supabase
      .from("next_chapters")
      .select("id, title")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false }),
    listingIds.length
      ? supabase.from("listing_chapters").select("listing_id, chapter_id").in("listing_id", listingIds)
      : Promise.resolve({ data: [] as { listing_id: string; chapter_id: string }[] }),
  ]);
  const chapterList = chapters ?? [];
  const linkMap = new Map((links ?? []).map((l) => [l.listing_id, l.chapter_id]));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
            Sell
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            List the things a chapter of your life left behind.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/chapters" className="text-sm text-[var(--color-muted)] underline underline-offset-4">
            Chapters
          </Link>
          <form action={createDraft}>
            <Button type="submit">New listing</Button>
          </form>
        </div>
      </div>

      {drafts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Drafts
          </h2>
          <ul className="flex flex-col gap-2">
            {drafts.map((l) => (
              <li key={l.id}>
                <Card className="flex items-center justify-between p-4">
                  <Link href={`/sell/${l.id}`} className="text-[var(--color-paper)] hover:underline">
                    {l.title?.trim() || "Untitled draft"}
                  </Link>
                  <span className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
                    {formatMinorPrice(l.price_amount, l.currency)}
                    <Link href={`/sell/${l.id}/story`} className="underline underline-offset-4 hover:text-[var(--color-paper)]">
                      Story
                    </Link>
                    {chapterList.length > 0 && (
                      <ChapterPicker
                        listingId={l.id}
                        chapters={chapterList}
                        currentChapterId={linkMap.get(l.id) ?? null}
                      />
                    )}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">
          Your listings
        </h2>
        {live.length === 0 ? (
          <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
            Nothing live yet. Start your first listing.
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {live.map((l) => (
              <li key={l.id}>
                <Card className="flex items-center justify-between p-4">
                  <Link href={listingPath(l)} className="text-[var(--color-paper)] hover:underline">
                    {l.title?.trim() || "Untitled"}
                  </Link>
                  <span className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
                    {formatMinorPrice(l.price_amount, l.currency)}
                    <Link href={`/sell/${l.id}/story`} className="underline underline-offset-4 hover:text-[var(--color-paper)]">
                      Story
                    </Link>
                    {chapterList.length > 0 && (
                      <ChapterPicker
                        listingId={l.id}
                        chapters={chapterList}
                        currentChapterId={linkMap.get(l.id) ?? null}
                      />
                    )}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
