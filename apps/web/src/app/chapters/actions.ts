"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { chapterCreateSchema, chapterUpdateSchema } from "@owy/validation";
import type { IdentityVisibility } from "@owy/database/types";
import { createClient } from "@/lib/supabase/server";
import { chapterPath } from "@/lib/listings";

export type ChapterActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/chapters");
  return { supabase, user };
}

// §6.1 — create a funding chapter.
export async function createChapter(input: {
  title: string;
  description?: string;
  targetMinor?: number;
  visibility?: IdentityVisibility;
}): Promise<ChapterActionResult> {
  const { supabase, user } = await requireUser();
  const parsed = chapterCreateSchema.safeParse({
    title: input.title,
    description: input.description ?? "",
    targetMinor: input.targetMinor,
    visibility: input.visibility ?? "public",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { data, error } = await supabase
    .from("next_chapters")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      target_amount: parsed.data.targetMinor ?? null,
      visibility: parsed.data.visibility,
    })
    .select("short_id, title")
    .single();
  if (error || !data) return { ok: false, error: "Could not create the chapter." };

  redirect(chapterPath(data.short_id, data.title));
}

export async function deleteChapter(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("next_chapters").delete().eq("id", id);
  revalidatePath("/chapters");
  redirect("/chapters");
}

// §6.2 — link (or unlink) a listing to a chapter. Passing null unlinks.
export async function linkListingToChapter(
  listingId: string,
  chapterId: string | null,
): Promise<ChapterActionResult> {
  const { supabase } = await requireUser();
  if (chapterId === null) {
    const { error } = await supabase
      .from("listing_chapters")
      .delete()
      .eq("listing_id", listingId);
    if (error) return { ok: false, error: "Could not unlink." };
    return { ok: true };
  }
  const { error } = await supabase
    .from("listing_chapters")
    .upsert({ listing_id: listingId, chapter_id: chapterId }, { onConflict: "listing_id" });
  if (error) return { ok: false, error: "Could not link to that chapter." };
  return { ok: true };
}

// §6.4 — "What happened next?"
export async function addChapterUpdate(
  chapterId: string,
  body: string,
): Promise<ChapterActionResult> {
  const { supabase, user } = await requireUser();
  const parsed = chapterUpdateSchema.safeParse({ body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Say a little more." };
  }
  const { error } = await supabase.from("chapter_updates").insert({
    chapter_id: chapterId,
    author_id: user.id,
    body: parsed.data.body,
    published_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Could not post the update." };
  return { ok: true };
}
