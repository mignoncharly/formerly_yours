// Provider-independent email contract. Notification/business code depends only
// on these types — never on Resend, nodemailer, or any single vendor. Swapping
// providers is an env change, not a code change.

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text fallback. Adapters derive one from `html` if absent. */
  text?: string;
  /** Overrides OWY_EMAIL_FROM for this one message. */
  from?: string;
};

export type EmailSendResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; retryable: boolean };

export interface EmailProvider {
  /** Stable identifier for logs/audit (e.g. "resend", "smtp", "log"). */
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
