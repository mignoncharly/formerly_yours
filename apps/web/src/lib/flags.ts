// Feature flags (§11.6) — server-side evaluation.
//
// Variants are NEVER hardcoded (`if (user.id === …)`); ask the database, which
// buckets each subject deterministically inside the flag's rollout percentage.
import "server-only";
import { createServiceSupabaseClient } from "@owy/database/server";

/**
 * Is `key` enabled for `subject` (a user id, or undefined for anonymous)?
 * Fails closed: any error or unknown flag returns false.
 */
export async function flagEnabled(key: string, subject?: string | null): Promise<boolean> {
  try {
    const db = createServiceSupabaseClient();
    const { data, error } = await db.rpc("feature_flag_enabled", {
      flag_key: key,
      subject: subject ?? null,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
