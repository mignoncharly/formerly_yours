import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Unread-notification indicator. Renders nothing for signed-out users; a bell
// with a count badge otherwise. Server component — one cheap indexed count.
export async function NotificationBell() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  const unread = count ?? 0;

  return (
    <Link
      href="/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative text-lg leading-none text-[var(--color-muted)] hover:text-[var(--color-paper)]"
    >
      <span aria-hidden>🔔</span>
      {unread > 0 ? (
        <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-[var(--color-primary)] px-1 text-center text-[10px] font-bold leading-4 text-[var(--color-ink)]">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
