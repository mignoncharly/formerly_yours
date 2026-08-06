"use server";

import { redirect } from "next/navigation";
import { onboardingSchema } from "@owy/validation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingResult = { error: string };

// Completes onboarding (§2.3): writes intent + username + country (+ optional
// avatar) and stamps onboarded_at, then enters the app. Protected pages gate on
// onboarded_at at render time, so no cookie is needed. RLS guarantees a user can
// only write their OWN row.
export async function completeOnboarding(input: {
  intent: string;
  username: string;
  countryCode: string;
  avatarPath?: string;
}): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const { intent, username, countryCode, avatarPath } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in?next=/onboarding");
  }

  // Friendly uniqueness pre-check; the DB unique constraint is the real guard.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) {
    return { error: "That username is taken. Try another." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      country_code: countryCode,
      avatar_path: avatarPath ?? null,
      signup_intent: intent,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation (username raced between the check and the write).
    if (error.code === "23505") {
      return { error: "That username is taken. Try another." };
    }
    return { error: "Could not save your profile. Please try again." };
  }

  redirect("/");
}
