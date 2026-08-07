"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { sendMessage } from "../actions";

type Msg = { id: string; body: string | null; senderId: string; createdAt: string };

export function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
}: {
  conversationId: string;
  initialMessages: Msg[];
  currentUserId: string;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [messages, setMessages] = React.useState<Msg[]>(initialMessages);
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // §8.2 — realtime: new messages arrive live (RLS-gated on the subscriber).
  React.useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            body: string | null;
            sender_id: string;
            created_at: string;
          };
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { id: m.id, body: m.body, senderId: m.sender_id, createdAt: m.created_at }],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (body.trim().length === 0) return;
    setBusy(true);
    setError(null);
    const res = await sendMessage(conversationId, body.trim());
    setBusy(false);
    if (res.ok) setBody("");
    else setError(res.error);
  }

  return (
    <div className="flex min-h-[60dvh] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-[color-mix(in_oklab,var(--color-primary)_22%,transparent)] text-[var(--color-paper)]"
                    : "border border-[var(--color-line)] text-[var(--color-paper)]"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">{error}</p>}

      <div className="mt-2 flex items-end gap-2">
        <textarea
          className="min-h-11 flex-1 resize-none rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[var(--color-paper)] outline-none"
          placeholder="Message…"
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button type="button" onClick={send} disabled={busy || body.trim().length === 0}>
          Send
        </Button>
      </div>
    </div>
  );
}
