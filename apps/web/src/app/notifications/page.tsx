import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { getSessionUser } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import type { Enums } from "@owy/database/types";
import { MarkReadOnView } from "./MarkReadOnView";

export const metadata: Metadata = { title: "Notifications" };

const VERB: Record<Enums<"notification_type">, string> = {
  offer_received: "made an offer",
  offer_accepted: "accepted your offer",
  offer_declined: "declined your offer",
  message_received: "sent you a message",
  sale: "bought your item",
  story_reaction: "reacted to your story",
  story_comment: "commented on your story",
  new_follower: "started following you",
};

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString();
}

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) return null; // middleware guards this route

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notifications")
    .select("id, actor_id, type, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = rows ?? [];
  const hasUnread = notifications.some((n) => n.read_at == null);

  const actorIds = [...new Set(notifications.map((n) => n.actor_id).filter(Boolean))] as string[];
  const admin = createServiceSupabaseClient();
  const { data: actors } = actorIds.length
    ? await admin.from("profiles").select("id, username, display_name").in("id", actorIds)
    : { data: [] };
  const nameById = new Map(
    (actors ?? []).map((a) => [a.id, a.display_name?.trim() || a.username || "Someone"]),
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-6 pb-24">
      <h1 className="mb-5 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        Notifications
      </h1>

      {notifications.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          Nothing yet. Reactions, offers, messages and sales will show up here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-line)]">
          {notifications.map((n) => {
            const actor = n.actor_id ? (nameById.get(n.actor_id) ?? "Someone") : "Someone";
            const body = (
              <div className="flex items-baseline justify-between gap-3 py-3">
                <p className="text-sm text-[var(--color-paper)]">
                  <span className="font-medium">{actor}</span>{" "}
                  <span className="text-[var(--color-muted)]">{VERB[n.type]}</span>
                </p>
                <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                  {timeAgo(n.created_at)}
                </span>
              </div>
            );
            const cls = n.read_at == null ? "-mx-2 rounded-lg bg-[var(--color-surface-2)] px-2" : "";
            return (
              <li key={n.id} className={cls}>
                {n.link ? (
                  <Link href={n.link} className="block hover:opacity-80">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}

      <MarkReadOnView hasUnread={hasUnread} />
      <BottomNav />
    </main>
  );
}
