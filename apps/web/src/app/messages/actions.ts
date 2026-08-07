"use server";

import { redirect } from "next/navigation";
import { messageSchema, detectOffPlatform } from "@owy/validation";
import { createClient } from "@/lib/supabase/server";

// §8.1 — open (or resume) the buyer<->seller thread for a listing, then go to it.
export async function startConversation(listingId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/messages");

  const { data, error } = await supabase.rpc("start_conversation", {
    in_listing: listingId,
  });
  if (error || !data) throw new Error("Could not start a conversation.");
  redirect(`/messages/${data}`);
}

// §8.3 — keep contact details and payments on-platform.
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to send messages." };

  const parsed = messageSchema.safeParse({ body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }
  if (detectOffPlatform(parsed.data.body)) {
    return {
      ok: false,
      error: "For your safety, keep contact details and payments on Once Was Yours.",
    };
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: "Could not send the message." };
  return { ok: true };
}
