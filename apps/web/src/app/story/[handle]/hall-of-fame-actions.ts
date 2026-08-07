"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type HallOfFameResult =
  | { ok: true; optedIn: boolean }
  | { ok: false; error: string };

// §11.3 — an author opts their own story into the public Hall of Fame. RLS
// ("authors update their own stories") guarantees the update only affects a
// story the caller authored, so we don't re-check ownership beyond auth.
export async function toggleHallOfFame(storyId: string): Promise<HallOfFameResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const { data: story } = await supabase
    .from("stories")
    .select("hall_of_fame_opt_in")
    .eq("id", storyId)
    .maybeSingle();
  if (!story) return { ok: false, error: "Story not found." };

  const next = !story.hall_of_fame_opt_in;
  const { data: updated, error } = await supabase
    .from("stories")
    .update({ hall_of_fame_opt_in: next })
    .eq("id", storyId)
    .select("hall_of_fame_opt_in");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "Could not update." };
  }

  revalidatePath("/hall-of-fame");
  return { ok: true, optedIn: next };
}
