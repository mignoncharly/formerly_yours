"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { stripe } from "@/lib/stripe";

// §9.2 — BUY → server validates + reserves + creates order/payment → Stripe
// Checkout (destination charge to the seller, application fee = platform fee +
// buyer protection). The browser never confirms; the webhook does.
export async function startCheckout(listingId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/feed");

  const admin = createServiceSupabaseClient();
  const { data, error } = await admin.rpc("create_pending_order", {
    in_listing: listingId,
    in_buyer: user.id,
  });
  if (error || !data?.[0]) throw new Error(error?.message ?? "Could not start checkout.");
  const o = data[0];
  if (!o.stripe_account) throw new Error("This seller can't accept payments yet.");

  const { data: ord } = await admin
    .from("orders")
    .select("subtotal_amount, seller_fee_amount, buyer_fee_amount, total_amount, currency")
    .eq("id", o.order_id)
    .single();
  const { data: item } = await admin
    .from("order_items")
    .select("listing_id")
    .eq("order_id", o.order_id)
    .single();
  const { data: listing } = item
    ? await admin.from("listings").select("title").eq("id", item.listing_id).maybeSingle()
    : { data: null };

  const applicationFee = (ord?.seller_fee_amount ?? 0) + (ord?.buyer_fee_amount ?? 0);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: (ord?.currency ?? "EUR").toLowerCase(),
          product_data: { name: listing?.title ?? "Once Was Yours purchase" },
          unit_amount: ord?.total_amount ?? o.total,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: { destination: o.stripe_account },
    },
    success_url: `${base}/orders?paid=1`,
    cancel_url: `${base}/feed`,
  });

  await admin.rpc("attach_payment_session", { in_order: o.order_id, in_session: session.id });
  redirect(session.url!);
}
