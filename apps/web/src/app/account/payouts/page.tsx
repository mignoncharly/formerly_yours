import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { createServiceSupabaseClient } from "@owy/database/server";
import { stripeConfigured } from "@/lib/stripe";
import { Button, Card } from "@/components/ui";
import { startSellerOnboarding, refreshSellerStatus } from "./actions";

export const metadata: Metadata = { title: "Payouts" };

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireOnboarded("/account/payouts");
  const sp = await searchParams;

  if (sp.return && stripeConfigured()) {
    await refreshSellerStatus();
  }

  const admin = createServiceSupabaseClient();
  const { data: acct } = await admin.rpc("get_seller_account", { in_user: profile.id });
  const account = acct?.[0];
  const enabled = Boolean(account?.payouts_enabled);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        Getting paid
      </h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        To receive money from sales, set up payouts with Stripe. Payments stay on
        Once Was Yours for protection.
      </p>

      {!stripeConfigured() ? (
        <Card className="p-5 text-sm text-[var(--color-muted)]">
          Payments aren&rsquo;t configured in this environment yet.
        </Card>
      ) : (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[var(--color-paper)]">Payout status</span>
            <span
              className={`text-sm ${enabled ? "text-[var(--color-good,#5ce1a8)]" : "text-[var(--color-gold)]"}`}
            >
              {enabled ? "Enabled" : account?.stripe_account_id ? "In review" : "Not set up"}
            </span>
          </div>
          <form action={startSellerOnboarding}>
            <Button type="submit">
              {account?.stripe_account_id ? "Continue Stripe setup" : "Set up payouts"}
            </Button>
          </form>
        </Card>
      )}
    </main>
  );
}
