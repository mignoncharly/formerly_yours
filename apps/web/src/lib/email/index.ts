import "server-only";
import { createServiceSupabaseClient } from "@owy/database/server";
import type { EmailMessage, EmailProvider } from "./types";
import { buildProvider, sendWithRetry } from "./core";

export type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://oncewasyours.com"
).replace(/\/$/, "");

// Transactional-email categories map 1:1 to notification_preferences columns.
export type EmailCategory = "offers" | "sales" | "messages";
const CATEGORY_COLUMN: Record<EmailCategory, string> = {
  offers: "email_offers",
  sales: "email_sales",
  messages: "email_messages",
};

let cached: { provider: EmailProvider; warnings: string[] } | null = null;
function getProvider(): EmailProvider {
  if (!cached) {
    cached = buildProvider();
    for (const w of cached.warnings) console.warn(`[email] ${w}`);
  }
  return cached.provider;
}

/** Introspection for health checks / smoke tooling. Never returns secrets. */
export function emailConfigStatus(): { provider: string; warnings: string[] } {
  if (!cached) cached = buildProvider();
  return { provider: cached.provider.name, warnings: cached.warnings };
}

/** Low-level send to a known address. Ungated. Returns success for logging. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const res = await sendWithRetry(getProvider(), { to, subject, html });
  if (!res.ok) console.warn(`[email] send failed: ${res.error}`);
  return res.ok;
}

type TransactionalOpts = {
  category: EmailCategory;
  subject: string;
  html: string;
  /** Idempotency key — the same (user, key) is delivered at most once. */
  dedupKey: string;
};

// Gated, deduplicated send to a user id. Sends only when ALL hold:
//   - a provider is configured (not noop),
//   - the user has a verified email address,
//   - the user hasn't opted out (master switch + category),
//   - this (recipient, dedupKey) email hasn't already been sent.
export async function emailUser(userId: string, opts: TransactionalOpts): Promise<void> {
  const provider = getProvider();
  if (provider.name === "none") return; // fast path: nothing configured

  try {
    const admin = createServiceSupabaseClient();

    // 1. Verified address only. Unverified/absent => never email.
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const to = userData?.user?.email;
    const verified = Boolean(userData?.user?.email_confirmed_at);
    if (!to || !verified) return;

    // 2. Preference gate (opt-out model: absent row = all enabled).
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_enabled, email_offers, email_sales, email_messages")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefs) {
      const p = prefs as unknown as Record<string, boolean>;
      if (p.email_enabled === false) return;
      if (p[CATEGORY_COLUMN[opts.category]] === false) return;
    }

    // 3. Idempotency: reserve the (recipient, dedupKey) slot BEFORE sending. A
    // unique-violation means another run already handled this email — stop.
    const { error: reserveErr } = await admin.from("email_deliveries").insert({
      recipient_id: userId,
      to_address: to,
      dedup_key: opts.dedupKey,
      subject: opts.subject,
      provider: provider.name,
      status: "sent",
    });
    if (reserveErr) {
      if (reserveErr.code !== "23505") console.warn(`[email] ledger insert: ${reserveErr.message}`);
      return; // 23505 => already sent
    }

    // 4. Send. On failure, mark the ledger row so a retry job could re-attempt.
    const res = await sendWithRetry(provider, { to, subject: opts.subject, html: opts.html });
    if (!res.ok) {
      await admin
        .from("email_deliveries")
        .update({ status: "failed", error: res.error.slice(0, 500) })
        .eq("recipient_id", userId)
        .eq("dedup_key", opts.dedupKey);
      console.warn(`[email] send failed for ${opts.dedupKey}: ${res.error}`);
    }
  } catch (err) {
    console.warn(`[email] emailUser error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Branded wrapper so transactional emails match the auth emails.
export function emailShell(
  title: string,
  body: string,
  ctaLabel?: string,
  ctaPath?: string,
): string {
  const cta =
    ctaLabel && ctaPath
      ? `<tr><td style="padding-top:24px;"><a href="${APP_URL}${ctaPath}" style="display:inline-block;background:#e9c46a;color:#100b1a;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:10px;">${ctaLabel}</a></td></tr>`
      : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0b0713;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0713;padding:40px 0;"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#100b1a;border:1px solid #2a2140;border-radius:16px;padding:40px 36px;font-family:Georgia,'Times New Roman',serif;color:#f6f1ea;">
<tr><td style="font-size:13px;letter-spacing:3px;color:#e9c46a;padding-bottom:24px;">ONCE WAS YOURS</td></tr>
<tr><td style="font-size:22px;line-height:1.3;padding-bottom:14px;">${title}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#b1a6c1;">${body}</td></tr>
${cta}
<tr><td style="border-top:1px solid #2a2140;padding-top:20px;font-size:13px;color:#6f6685;">Sell the past. Fund what&rsquo;s next.</td></tr>
</table></td></tr></table></body></html>`;
}
