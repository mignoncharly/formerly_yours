import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ModerationRow } from "./ModerationRow";

export const metadata: Metadata = { title: "Moderation" };

export default async function ModerationPage() {
  const profile = await requireOnboarded("/moderation");
  // Staff only. (RLS also stops non-staff from reading reports or acting.)
  if (profile.role === "user") notFound();

  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
          Moderation queue
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Signed in as {profile.role}. Every action is audited.
        </p>
      </div>

      {(reports ?? []).length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nothing to review.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {(reports ?? []).map((r) => (
            <ModerationRow key={r.id} report={r} />
          ))}
        </div>
      )}
    </main>
  );
}
