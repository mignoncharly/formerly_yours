import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { createServiceSupabaseClient } from "@owy/database/server";

// §9.3 — Stripe webhook. Signature-verified, idempotent (an event-id ledger plus
// confirm_order_paid being a no-op once paid). The ONLY place a payment is
// confirmed (§9.2). Failures are reported to Sentry so money issues are visible.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) {
    return new Response("webhook not configured", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    // Bad signature = forged events, or a secret mismatch (e.g. test secret
    // against live traffic). Worth surfacing.
    Sentry.captureException(err, { tags: { area: "stripe-webhook", stage: "verify" } });
    return new Response("invalid signature", { status: 400 });
  }

  const admin = createServiceSupabaseClient();

  // Idempotency claim: record the event id first. A unique-violation means we
  // already processed this delivery — return 200 so Stripe stops retrying.
  const { error: claimErr } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (claimErr) {
    if (claimErr.code === "23505") {
      return new Response("ok (duplicate)", { status: 200 });
    }
    // Ledger unavailable — don't block money processing; the RPC is still
    // idempotent. Log and continue without a claim.
    console.warn(`[stripe] event ledger insert failed: ${claimErr.message}`);
  }

  // Releases the idempotency claim so Stripe's retry reprocesses a failed event.
  const releaseClaim = async () => {
    if (!claimErr) await admin.from("stripe_events").delete().eq("id", event.id);
  };

  const fail = async (stage: string, detail: unknown) => {
    await releaseClaim();
    Sentry.captureMessage(`Stripe webhook processing error (${event.type})`, {
      level: "error",
      tags: { area: "stripe-webhook", stage, event_type: event.type },
      extra: { event_id: event.id, detail: String(detail).slice(0, 500) },
    });
    console.error(`[stripe] ${stage} failed for ${event.id} (${event.type})`);
    return new Response("processing error", { status: 500 }); // Stripe retries
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const intent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? "");
    const { error } = await admin.rpc("confirm_order_paid", {
      in_session: session.id,
      in_intent: intent,
    });
    if (error) return fail("confirm_order_paid", error.message);
  } else if (event.type === "account.updated") {
    // Connected seller account — keep payout status in sync (§9.1).
    const account = event.data.object as Stripe.Account;
    const enabled = Boolean(account.payouts_enabled && account.charges_enabled);
    const { error } = await admin.rpc("set_seller_payouts_by_account", {
      in_account: account.id,
      in_enabled: enabled,
      in_kyc: account.details_submitted ? "submitted" : "pending",
    });
    if (error) return fail("set_seller_payouts_by_account", error.message);
  }
  // Other events (e.g. payment_intent.succeeded) are intentionally no-ops:
  // checkout.session.completed is our authoritative, idempotent confirmation.
  // They are still recorded in stripe_events for the audit trail.

  return new Response("ok", { status: 200 });
}
