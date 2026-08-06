import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { SellWizard } from "./SellWizard";

export const metadata: Metadata = { title: "Edit listing" };

export default async function SellDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded("/sell");
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("seller_id", profile.id)
    .maybeSingle();
  if (!listing) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, parent_id, slug, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: images } = await supabase
    .from("listing_images")
    .select("id, storage_path, sort_order")
    .eq("listing_id", id)
    .order("sort_order", { ascending: true });

  // Private bucket → sign each path for preview (service role, short-lived).
  const admin = createServiceSupabaseClient();
  const initialImages = await Promise.all(
    (images ?? []).map(async (img) => {
      const { data } = await admin.storage
        .from("listing-images")
        .createSignedUrl(img.storage_path, 60 * 30);
      return {
        id: img.id,
        storagePath: img.storage_path,
        sortOrder: img.sort_order,
        url: data?.signedUrl ?? "",
      };
    }),
  );

  return (
    <SellWizard
      listing={listing}
      categories={categories ?? []}
      initialImages={initialImages}
      userId={profile.id}
    />
  );
}
