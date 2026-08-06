import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@owy/database/types";
import { createClient } from "@/lib/supabase/server";

/** The authenticated user, or null. Always revalidated against the Auth server. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The current user's profile row, or null if signed out / not yet created. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

// ---------------------------------------------------------------------------
// Page/layout gates (§2.3). We check onboarded_at at render time on protected
// routes rather than reading the DB in the proxy on every request. The proxy
// still enforces "must be signed in"; these enforce "must be onboarded".
// ---------------------------------------------------------------------------

/** Require a signed-in user with a profile; otherwise send to sign-in. */
export async function requireProfile(next = "/"): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }
  return profile;
}

/** Require an onboarded user; unonboarded users are sent to the wizard. */
export async function requireOnboarded(next = "/"): Promise<Profile> {
  const profile = await requireProfile(next);
  if (!profile.onboarded_at) {
    redirect("/onboarding");
  }
  return profile;
}
