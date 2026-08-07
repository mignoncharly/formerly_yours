"use server";

import { createClient } from "@/lib/supabase/server";
import type { ModerationStatus, ReportStatus } from "@owy/database/types";

export type ModResult = { ok: true } | { ok: false; error: string };

// These call SECURITY DEFINER functions that re-check is_staff() server-side and
// write the audit log — the frontend never decides authorization (§7.4/§7.6).

export async function moderateContent(
  contentType: string,
  contentId: string,
  newStatus: ModerationStatus,
  reason?: string,
): Promise<ModResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_content", {
    content_type: contentType,
    content_id: contentId,
    new_status: newStatus,
    reason: reason ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function suspendUser(
  target: string,
  suspended: boolean,
  reason?: string,
): Promise<ModResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("suspend_user", {
    target,
    suspended,
    reason: reason ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resolveReport(
  reportId: string,
  newStatus: ReportStatus,
  reason?: string,
): Promise<ModResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_report", {
    in_report: reportId,
    new_status: newStatus,
    reason: reason ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
