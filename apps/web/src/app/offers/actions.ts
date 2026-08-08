"use server";

import { offerAmountSchema } from "@owy/validation";
import { createClient } from "@/lib/supabase/server";
import { emailUser, emailShell } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export type OfferResult = { ok: true } | { ok: false; error: string };

async function rpcResult(
  promise: PromiseLike<{ error: { message: string } | null }>,
): Promise<OfferResult> {
  const { error } = await promise;
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// §8.4 — a buyer opens negotiation. RLS verifies buyer/seller/active-listing.
export async function makeOffer(input: {
  listingId: string;
  sellerId: string;
  amount: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to make an offer." };
  if (!rateLimit(`offer:${user.id}`, 10, 60_000).ok) {
    return { ok: false, error: "You're making offers too fast. Try again in a moment." };
  }

  const parsed = offerAmountSchema.safeParse(input.amount);
  if (!parsed.success) return { ok: false, error: "Enter a valid amount." };
  if (user.id === input.sellerId) return { ok: false, error: "You can't offer on your own listing." };

  const { data, error } = await supabase
    .from("offers")
    .insert({
      listing_id: input.listingId,
      buyer_id: user.id,
      seller_id: input.sellerId,
      proposed_by: user.id,
      amount: parsed.data,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not send the offer." };

  // Transactional email (best-effort; gated on verified address + prefs, and
  // deduped by dedupKey). Offers are low-frequency + high-value, so they warrant
  // email; chat does not.
  void emailUser(input.sellerId, {
    category: "offers",
    dedupKey: `offer_received:${data.id}`,
    subject: "You have a new offer — Once Was Yours",
    html: emailShell(
      "You have a new offer",
      "Someone just made an offer on one of your listings. Open Once Was Yours to accept, counter, or decline.",
      "View the offer",
      "/offers",
    ),
  });
  return { ok: true, id: data.id };
}

export async function acceptOffer(id: string): Promise<OfferResult> {
  const supabase = await createClient();
  const result = await rpcResult(supabase.rpc("accept_offer", { in_offer: id }));
  if (result.ok) {
    // Notify the buyer their offer was accepted (best-effort, gated on key).
    const { data: offer } = await supabase
      .from("offers")
      .select("buyer_id")
      .eq("id", id)
      .maybeSingle();
    if (offer?.buyer_id) {
      void emailUser(offer.buyer_id, {
        category: "offers",
        dedupKey: `offer_accepted:${id}`,
        subject: "Your offer was accepted — Once Was Yours",
        html: emailShell(
          "Your offer was accepted",
          "Good news — the seller accepted your offer. Complete checkout to secure the item before someone else does.",
          "Go to your offers",
          "/offers",
        ),
      });
    }
  }
  return result;
}

export async function declineOffer(id: string): Promise<OfferResult> {
  const supabase = await createClient();
  return rpcResult(supabase.rpc("decline_offer", { in_offer: id }));
}

export async function withdrawOffer(id: string): Promise<OfferResult> {
  const supabase = await createClient();
  return rpcResult(supabase.rpc("withdraw_offer", { in_offer: id }));
}

export async function counterOffer(id: string, amount: number): Promise<OfferResult> {
  const supabase = await createClient();
  const parsed = offerAmountSchema.safeParse(amount);
  if (!parsed.success) return { ok: false, error: "Enter a valid amount." };
  return rpcResult(supabase.rpc("counter_offer", { in_offer: id, new_amount: parsed.data }));
}
