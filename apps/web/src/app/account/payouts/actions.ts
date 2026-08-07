"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { stripe } from "@/lib/stripe";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// §9.1 — create (or resume) the seller's Stripe Connect Express account and send
// them to Stripe's hosted onboarding (identity/KYC → payouts enabled).
export async function startSellerOnboarding(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/payouts");

  const admin = createServiceSupabaseClient();
  const { data: acct } = await admin.rpc("get_seller_account", { in_user: user.id });
  let accountId = acct?.[0]?.stripe_account_id ?? null;

  const s = stripe();
  if (!accountId) {
    const account = await s.accounts.create({
      type: "express",
      email: user.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await admin.rpc("upsert_seller_stripe_account", { in_user: user.id, in_account: accountId });
  }

  const link = await s.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl()}/account/payouts`,
    return_url: `${appUrl()}/account/payouts?return=1`,
    type: "account_onboarding",
  });
  redirect(link.url);
}

// Pull the latest Connect status from Stripe (called when the seller returns).
export async function refreshSellerStatus(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createServiceSupabaseClient();
  const { data: acct } = await admin.rpc("get_seller_account", { in_user: user.id });
  const accountId = acct?.[0]?.stripe_account_id;
  if (!accountId) return;

  const account = await stripe().accounts.retrieve(accountId);
  const enabled = Boolean(account.payouts_enabled && account.charges_enabled);
  await admin.rpc("set_seller_payouts", {
    in_user: user.id,
    in_enabled: enabled,
    in_kyc: account.details_submitted ? "submitted" : "pending",
  });
}
