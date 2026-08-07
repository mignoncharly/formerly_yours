import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { formatMinorPrice, chapterPath } from "@/lib/listings";
import { NewChapterForm } from "./NewChapterForm";

export const metadata: Metadata = { title: "Next chapters" };

export default async function ChaptersPage() {
  const profile = await requireOnboarded("/chapters");
  const supabase = await createClient();

  const { data: chapters } = await supabase
    .from("next_chapters")
    .select("id, short_id, title, target_amount, currency, status")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  const withProgress = await Promise.all(
    (chapters ?? []).map(async (c) => {
      const { data } = await supabase.rpc("chapter_progress", { in_chapter: c.id });
      const p = data?.[0];
      return { ...c, raised: p?.raised ?? 0, itemsSold: p?.items_sold ?? 0 };
    }),
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
          Fund my next chapter
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          What comes next? Sales of your objects can fund it.
        </p>
      </div>

      {withProgress.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Your chapters
          </h2>
          <ul className="flex flex-col gap-2">
            {withProgress.map((c) => (
              <li key={c.id}>
                <Link href={chapterPath(c.short_id, c.title)} className="block">
                  <Card className="flex items-center justify-between p-4 hover:border-[color-mix(in_oklab,var(--color-paper)_30%,var(--color-line))]">
                    <span className="text-[var(--color-paper)]">{c.title}</span>
                    <span className="text-sm text-[var(--color-muted)]">
                      {formatMinorPrice(c.raised, c.currency)}
                      {c.target_amount ? ` / ${formatMinorPrice(c.target_amount, c.currency)}` : ""}
                      {" · "}
                      {c.itemsSold} sold →
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">
          New chapter
        </h2>
        <Card className="p-5">
          <NewChapterForm />
        </Card>
      </section>
    </main>
  );
}
