import type { EmailMessage, EmailProvider, EmailSendResult } from "../types";

// Resend over its HTTP API — no SMTP socket, so it works cleanly in serverless
// and standalone Node alike. Treats 429 + 5xx as retryable; 4xx (bad address,
// unverified domain) as terminal so we don't hammer the API over a config error.
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly defaultFrom: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from ?? this.defaultFrom,
          to: message.to,
          subject: message.subject,
          html: message.html,
          ...(message.text ? { text: message.text } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      // Network error / timeout — always worth a retry.
      return { ok: false, error: `resend network: ${errMsg(err)}`, retryable: true };
    }

    if (res.ok) {
      const id = await res
        .json()
        .then((b: { id?: string }) => b?.id)
        .catch(() => undefined);
      return { ok: true, id };
    }

    const retryable = res.status === 429 || res.status >= 500;
    const body = await res.text().catch(() => "");
    return { ok: false, error: `resend ${res.status}: ${body.slice(0, 200)}`, retryable };
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
