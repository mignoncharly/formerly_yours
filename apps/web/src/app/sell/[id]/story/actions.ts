"use server";

import { redirect } from "next/navigation";
import { storyPublishSchema, aiStoryActionSchema } from "@owy/validation";
import type {
  TablesUpdate,
  StoryMode,
  IdentityVisibility,
} from "@owy/database/types";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/listings";
import { polishStory } from "@/lib/ai/story";

export type StoryActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/sell");
  return { supabase, user };
}

export type StoryPatch = {
  headline?: string;
  body?: string;
  mode?: StoryMode;
  visibility?: IdentityVisibility;
};

export async function saveStory(
  storyId: string,
  patch: StoryPatch,
): Promise<StoryActionResult> {
  const { supabase } = await requireUser();
  const update: TablesUpdate<"stories"> = {};
  if (patch.headline !== undefined) update.headline = patch.headline.trim().slice(0, 120) || null;
  if (patch.body !== undefined) update.body = patch.body.slice(0, 4000);
  if (patch.mode !== undefined) update.mode = patch.mode;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("stories").update(update).eq("id", storyId);
  if (error) return { ok: false, error: "Could not save the story." };
  return { ok: true };
}

// Replace the story's relationship contexts (max 3). RLS ensures ownership.
export async function setStoryContexts(
  storyId: string,
  contextIds: number[],
): Promise<StoryActionResult> {
  const { supabase } = await requireUser();
  const ids = [...new Set(contextIds)].slice(0, 3);

  const { error: delErr } = await supabase
    .from("story_relationship_contexts")
    .delete()
    .eq("story_id", storyId);
  if (delErr) return { ok: false, error: "Could not update tags." };

  if (ids.length > 0) {
    const { error } = await supabase
      .from("story_relationship_contexts")
      .insert(ids.map((context_id) => ({ story_id: storyId, context_id })));
    if (error) return { ok: false, error: "Could not update tags." };
  }
  return { ok: true };
}

// AI rephrase (§4.3). Returns the rewritten text; the caller keeps the raw
// original separately. Degrades to the original when no key is configured.
export async function polishStoryAction(
  text: string,
  action: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  await requireUser();
  const parsed = aiStoryActionSchema.safeParse(action);
  if (!parsed.success) return { ok: false, error: "Unknown action." };
  return polishStory(text, parsed.data);
}

// Publish (§4.5). Stores the displayed body, the user's own words
// (original_input) for audit, the ai_assisted flag, and stamps published_at.
export async function publishStory(input: {
  storyId: string;
  headline: string;
  body: string;
  originalInput: string;
  mode: StoryMode;
  visibility: IdentityVisibility;
  contextIds: number[];
  aiAssisted: boolean;
}): Promise<StoryActionResult> {
  const { supabase } = await requireUser();

  const parsed = storyPublishSchema.safeParse({
    headline: input.headline,
    body: input.body,
    mode: input.mode,
    visibility: input.visibility,
    contextIds: input.contextIds,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the story." };
  }

  await setStoryContexts(input.storyId, input.contextIds);

  const { data: story, error } = await supabase
    .from("stories")
    .update({
      headline: input.headline.trim().slice(0, 120) || null,
      body: input.body.slice(0, 4000),
      original_input: input.originalInput.slice(0, 4000),
      ai_assisted: input.aiAssisted,
      mode: input.mode,
      visibility: input.visibility,
      published_at: new Date().toISOString(),
    })
    .eq("id", input.storyId)
    .select("short_id, listing_id")
    .single();
  if (error || !story) return { ok: false, error: "Could not publish the story." };

  const { data: listing } = await supabase
    .from("listings")
    .select("title")
    .eq("id", story.listing_id)
    .maybeSingle();

  redirect(`/story/${slugify(listing?.title ?? null)}-${story.short_id}`);
}
