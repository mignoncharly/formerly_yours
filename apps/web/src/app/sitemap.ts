import type { MetadataRoute } from "next";
import { createServiceSupabaseClient } from "@owy/database/server";
import { listingPath, storyPath, chapterPath } from "@/lib/listings";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const LIMIT = 5000;

// Refresh the sitemap hourly (new listings/stories/chapters).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const admin = createServiceSupabaseClient();

  const [{ data: listings }, { data: stories }, { data: chapters }, { data: cats }, { data: contexts }] =
    await Promise.all([
      admin.from("listings").select("short_id, title, updated_at").eq("status", "active").limit(LIMIT),
      admin.from("stories").select("short_id, listing_id, updated_at").not("published_at", "is", null).limit(LIMIT),
      admin
        .from("next_chapters")
        .select("short_id, title, updated_at")
        .eq("visibility", "public")
        .neq("status", "archived")
        .limit(LIMIT),
      admin.from("categories").select("slug").eq("is_active", true).is("parent_id", null),
      admin.from("relationship_contexts").select("slug").eq("is_active", true),
    ]);

  // Public seller/storyteller profiles.
  const { data: profiles } = await admin
    .from("profiles")
    .select("username, updated_at")
    .not("username", "is", null)
    .is("deactivated_at", null)
    .eq("is_suspended", false)
    .limit(LIMIT);

  // A story's slug comes from its linked listing's title.
  const storyListingIds = [...new Set((stories ?? []).map((s) => s.listing_id))];
  const { data: storyListings } = storyListingIds.length
    ? await admin.from("listings").select("id, title").in("id", storyListingIds)
    : { data: [] };
  const titleByListing = new Map((storyListings ?? []).map((l) => [l.id, l.title]));

  const entries: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/feed`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/browse`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${APP_URL}/hall-of-fame`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${APP_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/impressum`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  for (const c of cats ?? []) {
    entries.push({ url: `${APP_URL}/category/${c.slug}`, changeFrequency: "daily", priority: 0.6 });
  }
  for (const t of contexts ?? []) {
    entries.push({ url: `${APP_URL}/tag/${t.slug}`, changeFrequency: "weekly", priority: 0.5 });
  }
  for (const p of profiles ?? []) {
    entries.push({
      url: `${APP_URL}/u/${p.username}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }
  for (const l of listings ?? []) {
    entries.push({
      url: `${APP_URL}${listingPath({ title: l.title, short_id: l.short_id })}`,
      lastModified: new Date(l.updated_at),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }
  for (const s of stories ?? []) {
    entries.push({
      url: `${APP_URL}${storyPath(s.short_id, titleByListing.get(s.listing_id) ?? null)}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  for (const ch of chapters ?? []) {
    entries.push({
      url: `${APP_URL}${chapterPath(ch.short_id, ch.title)}`,
      lastModified: new Date(ch.updated_at),
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  return entries;
}
