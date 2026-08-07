import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { getSessionUser } from "@/lib/auth";
import { Card, Progress } from "@/components/ui";
import { formatMinorPrice, shortIdFromHandle } from "@/lib/listings";
import { ChapterUpdateComposer } from "./ChapterUpdateComposer";

async function loadChapter(handle: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("next_chapters")
    .select("*")
    .eq("short_id", shortIdFromHandle(handle))
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const chapter = await loadChapter(handle);
  if (!chapter) return { title: "Chapter not found" };
  return {
    title: chapter.title,
    description: chapter.description ?? "A next chapter on Once Was Yours.",
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const chapter = await loadChapter(handle);
  if (!chapter) notFound();

  const supabase = await createClient();
  const admin = createServiceSupabaseClient();

  const [progressRes, user, { data: updates }] = await Promise.all([
    supabase.rpc("chapter_progress", { in_chapter: chapter.id }),
    getSessionUser(),
    supabase
      .from("chapter_updates")
      .select("id, body, created_at")
      .eq("chapter_id", chapter.id)
      .order("created_at", { ascending: false }),
  ]);

  const progress = progressRes.data?.[0] ?? { raised: 0, items_sold: 0 };
  const isOwner = user?.id === chapter.owner_id;

  // Sold items funding the chapter (service role — sold listings are hidden from
  // the public by listing RLS).
  const { data: linkRows } = await admin
    .from("listing_chapters")
    .select("listing_id")
    .eq("chapter_id", chapter.id);
  const linkedIds = (linkRows ?? []).map((r) => r.listing_id);
  const { data: soldItems } = linkedIds.length
    ? await admin
        .from("listings")
        .select("id, title, price_amount, currency")
        .in("id", linkedIds)
        .eq("status", "sold")
        .order("sold_at", { ascending: false })
    : { data: [] };

  const pct = chapter.target_amount
    ? Math.min(100, Math.round((Number(progress.raised) / chapter.target_amount) * 100))
    : 0;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-5 py-10">
      {chapter.is_simulated && (
        <div className="mb-4 inline-block rounded-full border border-[color-mix(in_oklab,#e9c46a_50%,var(--color-line))] px-3 py-1 text-xs text-[var(--color-gold)]">
          Simulation — real payments arrive later
        </div>
      )}

      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-paper)]">
        {chapter.title}
      </h1>
      {chapter.description && (
        <p className="mt-2 text-[var(--color-muted)]">{chapter.description}</p>
      )}

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xl text-[var(--color-paper)]">
            {formatMinorPrice(Number(progress.raised), chapter.currency)}
            {chapter.target_amount ? (
              <span className="text-[var(--color-muted)]">
                {" "}
                / {formatMinorPrice(chapter.target_amount, chapter.currency)}
              </span>
            ) : null}
          </span>
          <span className="text-sm text-[var(--color-muted)]">
            {Number(progress.items_sold)} item{Number(progress.items_sold) === 1 ? "" : "s"} sold
          </span>
        </div>
        {chapter.target_amount ? <Progress value={pct} label="Funding progress" /> : null}
      </div>

      {(soldItems ?? []).length > 0 && (
        <ul className="mt-5 flex flex-col gap-1 text-sm">
          {(soldItems ?? []).map((it) => (
            <li key={it.id} className="flex justify-between text-[var(--color-muted)]">
              <span>✓ {it.title ?? "Item"}</span>
              <span>{formatMinorPrice(it.price_amount, it.currency)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* What happened next (§6.4) */}
      <section className="mt-10">
        <h2 className="text-[var(--color-paper)]">What happened next</h2>
        {isOwner && <ChapterUpdateComposer chapterId={chapter.id} />}

        <div className="mt-4 flex flex-col gap-4">
          {(updates ?? []).length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No updates yet.</p>
          ) : (
            (updates ?? []).map((u) => (
              <Card key={u.id} className="p-4">
                <p className="whitespace-pre-wrap text-[var(--color-paper)]">{u.body}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {new Date(u.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
