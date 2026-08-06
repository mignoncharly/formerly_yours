"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { listingPublishSchema } from "@owy/validation";
import type { ItemCondition, TablesUpdate } from "@owy/database/types";
import { createClient } from "@/lib/supabase/server";
import { listingPath } from "@/lib/listings";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/sell");
  return { supabase, user };
}

const cap = (s: string | undefined, n: number) =>
  s === undefined ? undefined : s.trim().slice(0, n) || null;

// §3.2 — create an empty draft, then enter the wizard.
export async function createDraft(): Promise<void> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("listings")
    .insert({ seller_id: user.id })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not start a listing.");
  redirect(`/sell/${data.id}`);
}

export type DraftPatch = {
  title?: string;
  categoryId?: number | null;
  condition?: ItemCondition | null;
  brand?: string;
  model?: string;
  description?: string;
  priceMinor?: number | null;
};

// Autosave one or more wizard fields (§3.2: "chaque étape peut être sauvegardée").
// Best-effort: caps lengths rather than hard-failing on transient input. RLS
// guarantees the row belongs to the caller.
export async function saveDraft(
  id: string,
  patch: DraftPatch,
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const update: TablesUpdate<"listings"> = {};
  if (patch.title !== undefined) update.title = cap(patch.title, 80);
  if (patch.categoryId !== undefined) update.category_id = patch.categoryId ?? null;
  if (patch.condition !== undefined) update.condition = patch.condition ?? null;
  if (patch.brand !== undefined) update.brand = cap(patch.brand, 80);
  if (patch.model !== undefined) update.model = cap(patch.model, 80);
  if (patch.description !== undefined) update.description = cap(patch.description, 2000);
  if (patch.priceMinor !== undefined) {
    update.price_amount =
      typeof patch.priceMinor === "number" && Number.isInteger(patch.priceMinor) && patch.priceMinor > 0
        ? patch.priceMinor
        : null;
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("listings").update(update).eq("id", id);
  if (error) return { ok: false, error: "Could not save. Check your connection." };
  return { ok: true };
}

// Register an image row after the browser uploaded the (compressed, EXIF-stripped)
// webp to the private bucket. RLS ensures the parent listing is the caller's.
export async function attachImage(input: {
  listingId: string;
  storagePath: string;
  width: number;
  height: number;
  sortOrder: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("listing_images")
    .insert({
      listing_id: input.listingId,
      storage_path: input.storagePath,
      width: input.width,
      height: input.height,
      sort_order: input.sortOrder,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not save the photo." };
  return { ok: true, id: data.id };
}

export async function removeImage(imageId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data: img } = await supabase
    .from("listing_images")
    .select("id, storage_path")
    .eq("id", imageId)
    .maybeSingle();
  if (!img) return { ok: true };
  await supabase.storage.from("listing-images").remove([img.storage_path]);
  const { error } = await supabase.from("listing_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: "Could not remove the photo." };
  return { ok: true };
}

// §3.3 step 7 → publish. Enforces the same completeness the DB CHECK does, plus
// "at least one photo", then flips the listing live and sends to its page.
export async function publishListing(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: l } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!l) return { ok: false, error: "Listing not found." };

  const parsed = listingPublishSchema.safeParse({
    title: l.title ?? "",
    categoryId: l.category_id ?? undefined,
    condition: l.condition ?? undefined,
    priceMinor: l.price_amount ?? undefined,
    brand: l.brand ?? "",
    model: l.model ?? "",
    description: l.description ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Some details are still missing.",
    };
  }

  const { count } = await supabase
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", id);
  if (!count) return { ok: false, error: "Add at least one photo before publishing." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("country_code, city")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("listings")
    .update({
      status: "active",
      published_at: new Date().toISOString(),
      country_code: l.country_code ?? profile?.country_code ?? null,
      city: l.city ?? profile?.city ?? null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Could not publish. Please try again." };

  revalidatePath("/sell");
  redirect(listingPath(l));
}

export async function deleteDraft(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { data: imgs } = await supabase
    .from("listing_images")
    .select("storage_path")
    .eq("listing_id", id);
  if (imgs?.length) {
    await supabase.storage
      .from("listing-images")
      .remove(imgs.map((i) => i.storage_path));
  }
  await supabase.from("listings").delete().eq("id", id);
  revalidatePath("/sell");
  redirect("/sell");
}
