"use server";

import { reactionTypeSchema } from "@owy/validation";
import type { ReactionType } from "@owy/database/types";
import { createClient } from "@/lib/supabase/server";

export type ReactResult =
  | { ok: true; counts: Record<string, number>; mine: ReactionType | null }
  | { ok: false; error: string };

// §4.6 — one signature reaction per user per story. Passing null clears it.
export async function reactToStory(
  storyId: string,
  reaction: string | null,
): Promise<ReactResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to react." };

  if (reaction === null) {
    await supabase
      .from("story_reactions")
      .delete()
      .eq("story_id", storyId)
      .eq("user_id", user.id);
  } else {
    const parsed = reactionTypeSchema.safeParse(reaction);
    if (!parsed.success) return { ok: false, error: "Unknown reaction." };
    const { error } = await supabase
      .from("story_reactions")
      .upsert(
        { story_id: storyId, user_id: user.id, reaction: parsed.data },
        { onConflict: "story_id,user_id" },
      );
    if (error) return { ok: false, error: "Could not react." };
  }

  const { data: rows } = await supabase.rpc("story_reaction_counts", {
    in_story: storyId,
  });
  const counts: Record<string, number> = {};
  for (const r of rows ?? []) counts[r.reaction] = Number(r.count);

  const { data: mineRow } = await supabase
    .from("story_reactions")
    .select("reaction")
    .eq("story_id", storyId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { ok: true, counts, mine: mineRow?.reaction ?? null };
}
