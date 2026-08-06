"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profileUpdateSchema } from "@owy/validation";
import { createServiceSupabaseClient } from "@owy/database/server";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok?: true; error?: string };

/** Edit public-safe profile fields. RLS restricts the write to the own row. */
export async function updateProfile(input: {
  username: string;
  displayName?: string;
  bio?: string;
  city?: string;
  countryCode: string;
}): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }
  const { username, displayName, bio, city, countryCode } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");

  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { error: "That username is taken. Try another." };

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: displayName ? displayName : null,
      bio: bio ? bio : null,
      city: city ? city : null,
      country_code: countryCode,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is taken. Try another." };
    return { error: "Could not save your changes. Please try again." };
  }

  revalidatePath("/account");
  return { ok: true };
}

/** Reversible self-deactivation: hide the profile and sign out. */
export async function deactivateAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { error } = await supabase
    .from("profiles")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: "Could not deactivate your account. Please try again." };

  await supabase.auth.signOut();
  redirect("/");
}

/** Clear deactivation (available from the account page after signing back in). */
export async function reactivateAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");

  const { error } = await supabase
    .from("profiles")
    .update({ deactivated_at: null })
    .eq("id", user.id);
  if (error) return { error: "Could not reactivate your account. Please try again." };

  revalidatePath("/account");
  return { ok: true };
}

/**
 * Permanent account deletion. Deleting the auth user cascades to the profile
 * (FK on delete cascade). This requires the service (admin) client — a user
 * cannot delete their own auth.users row with the RLS client — so we verify the
 * session first and only ever delete the *caller's own* id.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const admin = createServiceSupabaseClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Could not delete your account. Please try again." };

  await supabase.auth.signOut();
  redirect("/");
}
