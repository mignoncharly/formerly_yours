import type { EmailMessage, EmailProvider, EmailSendResult } from "../types";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean; // true for 465 (implicit TLS), false for 587 (STARTTLS)
  user: string;
  pass: string;
  defaultFrom: string;
};

// Generic SMTP provider — works with Zoho Mail, Zoho ZeptoMail, Gmail, Amazon
// SES SMTP, Mailgun, etc. nodemailer is loaded lazily (dynamic import) so the
// dependency is only pulled in when SMTP is actually the selected provider;
// Resend/log deployments never touch it. A single transporter is reused across
// sends (connection pooling) rather than reconnecting per message.
// Minimal structural shape we actually use — avoids a hard compile-time
// dependency on nodemailer's full Transporter type (it's dynamically imported).
type SmtpTransport = { sendMail: (o: unknown) => Promise<{ messageId?: string }> };

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private readonly config: SmtpConfig;
  private transporterPromise: Promise<SmtpTransport> | null = null;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  private getTransporter(): Promise<SmtpTransport> {
    if (!this.transporterPromise) {
      this.transporterPromise = import("nodemailer").then((nm) => {
        const create = (nm.default ?? nm).createTransport;
        return create({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: { user: this.config.user, pass: this.config.pass },
          pool: true,
          maxConnections: 3,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
        }) as unknown as SmtpTransport;
      });
    }
    return this.transporterPromise;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const transporter = await this.getTransporter();
      const info = await transporter.sendMail({
        from: message.from ?? this.config.defaultFrom,
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      });
      return { ok: true, id: info.messageId };
    } catch (err) {
      // SMTP 4xx (greylist/rate) and connection drops are transient; 5xx (bad
      // recipient/auth) are terminal. nodemailer exposes `responseCode`.
      const code = (err as { responseCode?: number })?.responseCode;
      const retryable = code === undefined || code < 500;
      return { ok: false, error: `smtp: ${errMsg(err)}`, retryable };
    }
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
