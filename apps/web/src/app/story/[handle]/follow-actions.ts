"use server";

import { createClient } from "@/lib/supabase/server";

export type FollowResult =
  | { ok: true; following: boolean }
  | { ok: false; error: string };

// §5.6 — follow a profile (the seller/storyteller). RLS ensures a user can only
// create/remove their OWN follow edges.
export async function toggleFollow(followedId: string): Promise<FollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to follow." };
  if (user.id === followedId) return { ok: false, error: "You can't follow yourself." };

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("followed_id", followedId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followed_id", followedId);
    if (error) return { ok: false, error: "Could not update." };
    return { ok: true, following: false };
  }

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followed_id: followedId });
  if (error) return { ok: false, error: "Could not follow." };
  return { ok: true, following: true };
}
