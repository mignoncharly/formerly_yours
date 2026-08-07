"use server";

import { disputeOpenSchema } from "@owy/validation";
import { createClient } from "@/lib/supabase/server";
import { shippingProvider } from "@/lib/shipping";

export type OrderActionResult = { ok: true } | { ok: false; error: string };

// §10 order lifecycle. These call SECURITY DEFINER functions that verify the
// acting user (seller/buyer) — run with the user's session, not the service role.
export async function markShipped(orderId: string): Promise<OrderActionResult> {
  const supabase = await createClient();
  const label = await shippingProvider().createLabel(orderId);
  const { error } = await supabase.rpc("mark_shipped", {
    in_order: orderId,
    in_tracking: label.trackingNumber,
    in_provider: "mock",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markDelivered(orderId: string): Promise<OrderActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_delivered", { in_order: orderId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function completeOrder(orderId: string): Promise<OrderActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_order", { in_order: orderId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function openDispute(
  orderId: string,
  reason: string,
  details: string,
): Promise<OrderActionResult> {
  const parsed = disputeOpenSchema.safeParse({ reason, details });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Choose a reason." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_dispute", {
    in_order: orderId,
    in_reason: parsed.data.reason,
    in_details: parsed.data.details?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
