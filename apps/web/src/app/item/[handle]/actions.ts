"use server";

import { createClient } from "@/lib/supabase/server";

export type ToggleSaveResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string };

// §3.7 — toggle a ♡ saved listing for the current user. RLS ensures a user can
// only ever write their own saved_listings rows.
export async function toggleSave(listingId: string): Promise<ToggleSaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save listings." };

  const { data: existing } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) return { ok: false, error: "Could not update." };
    return { ok: true, saved: false };
  }

  const { error } = await supabase
    .from("saved_listings")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) return { ok: false, error: "Could not save." };
  return { ok: true, saved: true };
}
