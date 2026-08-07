import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MessageThread } from "./MessageThread";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded("/messages");
  const { id } = await params;
  const supabase = await createClient();

  // RLS returns the conversation only if the viewer is a member.
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, body, sender_id, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const initial = (msgs ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    senderId: m.sender_id,
    createdAt: m.created_at,
  }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-6">
      <p className="mb-2 text-xs text-[var(--color-faint)]">
        Keep payments and contact details on Once Was Yours for protection.
      </p>
      <MessageThread
        conversationId={id}
        initialMessages={initial}
        currentUserId={profile.id}
      />
    </main>
  );
}
