"use server";

import { offerAmountSchema } from "@owy/validation";
import { createClient } from "@/lib/supabase/server";

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
  return { ok: true, id: data.id };
}

export async function acceptOffer(id: string): Promise<OfferResult> {
  const supabase = await createClient();
  return rpcResult(supabase.rpc("accept_offer", { in_offer: id }));
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
