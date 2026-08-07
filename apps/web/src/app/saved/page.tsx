import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedThumbnails } from "@/lib/listing-images";
import { ListingCard } from "@/components/listings/ListingCard";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const profile = await requireOnboarded("/saved");
  const supabase = await createClient();

  const { data: saves } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const ids = (saves ?? []).map((s) => s.listing_id);

  // Only still-active saved listings are shown (RLS also enforces this).
  const { data: listings } = ids.length
    ? await supabase
        .from("listings")
        .select("id, short_id, title, price_amount, currency, condition")
        .in("id", ids)
        .eq("status", "active")
    : { data: [] };

  const rows = listings ?? [];
  const thumbs = await getSignedThumbnails(rows.map((l) => l.id));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
          Saved
        </h1>
        <Link href="/browse" className="text-sm text-[var(--color-muted)] underline underline-offset-4">
          Browse →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nothing saved yet. Tap ♡ on a listing to keep it here.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {rows.map((l) => (
            <ListingCard key={l.id} listing={l} thumbnail={thumbs.get(l.id)} />
          ))}
        </div>
      )}
    </main>
  );
}
