import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceSupabaseClient } from "@owy/database/server";

// §9.3 — Stripe webhook. Signature-verified, idempotent (confirm_order_paid is a
// no-op if already paid). The ONLY place a payment is confirmed (§9.2).
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
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  const admin = createServiceSupabaseClient();

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
    if (error) {
      // Return 500 so Stripe retries.
      return new Response("processing error", { status: 500 });
    }
  }

  return new Response("ok", { status: 200 });
}
