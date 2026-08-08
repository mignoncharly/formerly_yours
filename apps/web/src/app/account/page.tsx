import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { requireOnboarded, getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditForm } from "./ProfileEditForm";
import { EmailPrefsForm } from "./EmailPrefsForm";
import { AccountDangerZone } from "./AccountDangerZone";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Once Was Yours profile and account.",
};

export default async function AccountPage() {
  // Gates: signed in (proxy) + onboarded (here). Returns the profile.
  const profile = await requireOnboarded("/account");
  const user = await getSessionUser();

  const deactivated = Boolean(profile.deactivated_at);

  // Transactional-email preferences (opt-out model: absent row = all enabled).
  const supabase = await createClient();
  const { data: prefsRow } = await supabase
    .from("notification_preferences")
    .select("email_enabled, email_offers, email_sales, email_messages")
    .maybeSingle();
  const emailPrefs = {
    email_enabled: prefsRow?.email_enabled ?? true,
    email_offers: prefsRow?.email_offers ?? true,
    email_sales: prefsRow?.email_sales ?? true,
    email_messages: prefsRow?.email_messages ?? false,
  };

  return (
    <main className="min-h-dvh px-5 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Once Was Yours home">
            <Logo />
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="owy-btn owy-btn-ghost !px-4 !py-2 text-sm">
              Sign out
            </button>
          </form>
        </header>

        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
            Your account
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Signed in as {user?.email ?? "your account"}.
          </p>
        </div>

        {deactivated ? (
          <Card className="border-[color-mix(in_oklab,#ffcf7a_40%,var(--color-line))] p-5">
            <h2 className="text-[var(--color-paper)]">Account deactivated</h2>
            <div className="mt-3">
              <AccountDangerZone deactivated />
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/sell" className="block">
                <Card className="flex h-full items-center justify-between p-5 hover:border-[color-mix(in_oklab,var(--color-paper)_30%,var(--color-line))]">
                  <span className="text-[var(--color-paper)]">Sell an item →</span>
                </Card>
              </Link>
              <Link href="/browse" className="block">
                <Card className="flex h-full items-center justify-between p-5 hover:border-[color-mix(in_oklab,var(--color-paper)_30%,var(--color-line))]">
                  <span className="text-[var(--color-paper)]">Browse →</span>
                </Card>
              </Link>
            </div>

            <Card className="p-5">
              <h2 className="mb-4 text-[var(--color-paper)]">Profile</h2>
              <ProfileEditForm
                initial={{
                  username: profile.username ?? "",
                  displayName: profile.display_name ?? "",
                  bio: profile.bio ?? "",
                  city: profile.city ?? "",
                  countryCode: profile.country_code ?? "",
                }}
              />
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-[var(--color-paper)]">Email preferences</h2>
              <EmailPrefsForm initial={emailPrefs} />
            </Card>

            <Card className="p-5">
              <h2 className="mb-1 text-[var(--color-paper)]">Danger zone</h2>
              <AccountDangerZone deactivated={false} />
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
