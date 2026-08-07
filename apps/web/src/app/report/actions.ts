"use server";

import { reportCreateSchema } from "@owy/validation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export type ReportTarget = {
  storyId?: string;
  commentId?: string;
  listingId?: string;
  chapterId?: string;
  userId?: string;
};

export type ReportResult = { ok: true } | { ok: false; error: string };

// §7.1 — file a report against exactly one target (DB CHECK enforces one).
export async function createReport(input: {
  reason: string;
  details?: string;
  target: ReportTarget;
}): Promise<ReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to report." };
  if (!rateLimit(`report:${user.id}`, 10, 60_000).ok) {
    return { ok: false, error: "You're reporting too fast. Try again in a moment." };
  }

  const parsed = reportCreateSchema.safeParse({
    reason: input.reason,
    details: input.details ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Choose a reason." };

  const t = input.target;
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details?.trim() || null,
    story_id: t.storyId ?? null,
    comment_id: t.commentId ?? null,
    listing_id: t.listingId ?? null,
    chapter_id: t.chapterId ?? null,
    reported_user_id: t.userId ?? null,
  });
  if (error) return { ok: false, error: "Could not submit the report." };
  return { ok: true };
}

// §7 / §8.3 — block a user. RLS ensures a user only writes their own blocks.
export async function toggleBlock(
  blockedId: string,
): Promise<{ ok: true; blocked: boolean } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to block." };
  if (user.id === blockedId) return { ok: false, error: "You can't block yourself." };

  const { data: existing } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);
    if (error) return { ok: false, error: "Could not update." };
    return { ok: true, blocked: false };
  }

  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error) return { ok: false, error: "Could not block." };
  return { ok: true, blocked: true };
}
