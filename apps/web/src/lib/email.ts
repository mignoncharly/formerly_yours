import "server-only";
import { createServiceSupabaseClient } from "@owy/database/server";

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://oncewasyours.gestionatech.de"
).replace(/\/$/, "");

// Transactional email is gated behind RESEND_API_KEY (like PostHog/OpenAI): no
// key => no-op. Uses Resend's HTTP API so there's no SMTP dependency in the
// bundle, and it's always best-effort — email must never block a user action.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const from = process.env.OWY_EMAIL_FROM ?? "Once Was Yours <info@gestionatech.de>";
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
  } catch {
    /* best-effort */
  }
}

// Resolve a user's email from auth and send. No-op without RESEND_API_KEY.
export async function emailUser(userId: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const admin = createServiceSupabaseClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    const to = data?.user?.email;
    if (to) await sendEmail(to, subject, html);
  } catch {
    /* best-effort */
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
