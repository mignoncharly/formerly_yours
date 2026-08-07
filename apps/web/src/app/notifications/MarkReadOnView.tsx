"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead } from "./actions";

// Opening the inbox clears the unread badge: mark everything read once on mount,
// then refresh so the bell count updates.
export function MarkReadOnView({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  React.useEffect(() => {
    if (!hasUnread) return;
    void markAllNotificationsRead().then(() => router.refresh());
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
