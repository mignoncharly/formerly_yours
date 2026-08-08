// Vendor-agnostic core: provider selection + retry. No `server-only` and no DB
// imports live here so this file is unit-testable under `node --test`. The
// server-only composition (user lookup, prefs gating, dedup ledger) is in
// index.ts.
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";
import { LogEmailProvider } from "./providers/log";
import { ResendEmailProvider } from "./providers/resend";
import { SmtpEmailProvider } from "./providers/smtp";

export const DEFAULT_FROM =
  process.env.OWY_EMAIL_FROM ?? "Once Was Yours <info@gestionatech.de>";

// Silently drops mail. Default when nothing is configured, so an unconfigured
// box degrades to "no email" rather than a crash or a blocked user action.
export class NoopEmailProvider implements EmailProvider {
  readonly name = "none";
  async send(): Promise<EmailSendResult> {
    return { ok: true };
  }
}

export type EmailEnv = {
  OWY_EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
  OWY_EMAIL_FROM?: string;
};

// OWY_EMAIL_PROVIDER forces a choice (resend | smtp | log | none). When unset
// ("auto") we pick from whatever credentials exist, else noop.
export function buildProvider(env: EmailEnv = process.env as EmailEnv): {
  provider: EmailProvider;
  warnings: string[];
} {
  const warnings: string[] = [];
  const from = env.OWY_EMAIL_FROM ?? DEFAULT_FROM;
  const choice = (env.OWY_EMAIL_PROVIDER ?? "auto").toLowerCase();

  const hasResend = Boolean(env.RESEND_API_KEY);
  const hasSmtp = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

  const makeResend = () => new ResendEmailProvider(env.RESEND_API_KEY!, from);
  const makeSmtp = () => {
    const port = Number(env.SMTP_PORT ?? 465);
    return new SmtpEmailProvider({
      host: env.SMTP_HOST!,
      port,
      secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465,
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
      defaultFrom: from,
    });
  };

  switch (choice) {
    case "resend":
      if (!hasResend) warnings.push("OWY_EMAIL_PROVIDER=resend but RESEND_API_KEY is unset.");
      return { provider: hasResend ? makeResend() : new NoopEmailProvider(), warnings };
    case "smtp":
      if (!hasSmtp) warnings.push("OWY_EMAIL_PROVIDER=smtp but SMTP_HOST/USER/PASS incomplete.");
      return { provider: hasSmtp ? makeSmtp() : new NoopEmailProvider(), warnings };
    case "log":
      return { provider: new LogEmailProvider(), warnings };
    case "none":
      return { provider: new NoopEmailProvider(), warnings };
    case "auto":
    default:
      if (hasResend) return { provider: makeResend(), warnings };
      if (hasSmtp) return { provider: makeSmtp(), warnings };
      return { provider: new NoopEmailProvider(), warnings };
  }
}

// Best-effort send: never throws. Retries only failures the provider flags
// retryable (429 / 5xx / network), with a short linear backoff.
export async function sendWithRetry(
  provider: EmailProvider,
  message: EmailMessage,
  opts: { maxAttempts?: number; backoffMs?: number } = {},
): Promise<EmailSendResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const backoffMs = opts.backoffMs ?? 500;
  let last: EmailSendResult = { ok: false, error: "no attempt", retryable: false };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      last = await provider.send(message);
    } catch (err) {
      last = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      };
    }
    if (last.ok || !last.retryable) break;
    if (attempt < maxAttempts && backoffMs > 0) await sleep(attempt * backoffMs);
  }
  return last;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
