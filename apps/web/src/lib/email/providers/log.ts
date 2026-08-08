import type { EmailMessage, EmailProvider, EmailSendResult } from "../types";

// Development / no-credentials provider. It never sends anything over the wire;
// it just records that an email *would* have gone out. This is the safe default
// so a misconfigured production box degrades to "no email" rather than "crash".
export class LogEmailProvider implements EmailProvider {
  readonly name = "log";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    // eslint-disable-next-line no-console
    console.info(
      `[email:log] would send to=${redact(message.to)} subject=${JSON.stringify(message.subject)}`,
    );
    return { ok: true };
  }
}

// Never log a full address at info level — keep just enough to correlate.
function redact(address: string): string {
  const [user, domain] = address.split("@");
  if (!domain || !user) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}
