"use server";

import { createClient } from "@/lib/supabase/server";

// Mark the caller's unread notifications read (RLS + the SECURITY DEFINER
// function both scope this to auth.uid()).
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("mark_notifications_read", { ids: null });
}
