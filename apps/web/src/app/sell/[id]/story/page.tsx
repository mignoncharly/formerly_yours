import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aiStoryConfigured } from "@/lib/ai/story";
import { StoryEditor } from "./StoryEditor";

export const metadata: Metadata = { title: "Tell the story" };

export default async function StoryEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded("/sell");
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, short_id")
    .eq("id", id)
    .eq("seller_id", profile.id)
    .maybeSingle();
  if (!listing) notFound();

  // One story per listing — find or create it.
  let { data: story } = await supabase
    .from("stories")
    .select("*")
    .eq("listing_id", id)
    .maybeSingle();

  if (!story) {
    const { data: created } = await supabase
      .from("stories")
      .insert({ listing_id: id, author_id: profile.id })
      .select("*")
      .single();
    story = created ?? null;
  }
  if (!story) notFound();

  const [{ data: contexts }, { data: selected }] = await Promise.all([
    supabase
      .from("relationship_contexts")
      .select("id, slug, label, emoji, is_sensitive")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("story_relationship_contexts")
      .select("context_id")
      .eq("story_id", story.id),
  ]);

  return (
    <StoryEditor
      story={story}
      listingTitle={listing.title}
      contexts={contexts ?? []}
      selectedContextIds={(selected ?? []).map((s) => s.context_id)}
      aiEnabled={aiStoryConfigured()}
    />
  );
}
