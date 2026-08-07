import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { OfferRow, type OfferView } from "./OfferRow";

export const metadata: Metadata = { title: "Offers" };

export default async function OffersPage() {
  const profile = await requireOnboarded("/offers");
  const supabase = await createClient();

  const { data: offers } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, seller_id, proposed_by, amount, status")
    .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
    .order("created_at", { ascending: false });

  // Listing titles (may be reserved now → hidden from the buyer by RLS; service).
  const admin = createServiceSupabaseClient();
  const ids = [...new Set((offers ?? []).map((o) => o.listing_id))];
  const { data: listings } = ids.length
    ? await admin.from("listings").select("id, title").in("id", ids)
    : { data: [] };
  const titleById = new Map((listings ?? []).map((l) => [l.id, l.title]));

  const rows: OfferView[] = (offers ?? []).map((o) => {
    const proposedByMe = o.proposed_by === profile.id;
    return {
      id: o.id,
      listingTitle: titleById.get(o.listing_id) ?? "Listing",
      amount: o.amount,
      status: o.status,
      proposedByMe,
      amRecipient: !proposedByMe && o.status === "pending",
      counterpartyLabel: o.seller_id === profile.id ? "You're selling" : "You're buying",
    };
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        Offers
      </h1>
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">No offers yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((o) => (
            <OfferRow key={o.id} offer={o} />
          ))}
        </div>
      )}
    </main>
  );
}
