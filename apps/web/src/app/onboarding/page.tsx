import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { getCurrentProfile } from "@/lib/auth";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Set up your Once Was Yours profile.",
};

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();

  // Not signed in → the proxy already redirects, but guard defensively.
  if (!profile) {
    redirect("/sign-in?next=/onboarding");
  }
  // Already onboarded → nothing to do here.
  if (profile.onboarded_at) {
    redirect("/");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6">
          <OnboardingWizard initialUsername={profile.username} />
        </Card>
      </div>
    </main>
  );
}
