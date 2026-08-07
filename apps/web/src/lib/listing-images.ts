import "server-only";

import { createServiceSupabaseClient } from "@owy/database/server";

// Sign the primary (lowest sort_order) photo for each listing, for grids/cards.
// The bucket is private, so anonymous browse pages need service-role signed URLs.
export async function getSignedThumbnails(
  listingIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (listingIds.length === 0) return out;

  const admin = createServiceSupabaseClient();
  const { data: images } = await admin
    .from("listing_images")
    .select("listing_id, storage_path, sort_order")
    .in("listing_id", listingIds)
    .order("sort_order", { ascending: true });

  const firstByListing = new Map<string, string>();
  for (const img of images ?? []) {
    if (!firstByListing.has(img.listing_id)) {
      firstByListing.set(img.listing_id, img.storage_path);
    }
  }

  await Promise.all(
    [...firstByListing.entries()].map(async ([listingId, path]) => {
      const { data } = await admin.storage
        .from("listing-images")
        .createSignedUrl(path, 60 * 60);
      if (data?.signedUrl) out.set(listingId, data.signedUrl);
    }),
  );

  return out;
}
