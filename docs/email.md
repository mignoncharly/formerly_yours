# Transactional email — provider comparison, decision & setup

Once Was Yours sends **transactional** email only (offer received, offer
accepted, and — when enabled — sale/message notifications). There are no
marketing/bulk sends. Volume today is tiny (a handful per active negotiation).

The app is **provider-independent** (see `apps/web/src/lib/email/`): business code
calls `emailUser(userId, {category, dedupKey, subject, html})` and never touches a
vendor SDK. The provider is chosen at runtime from env — swapping vendors is a
config change, not a code change.

## The adapter

```
EmailProvider (interface)         apps/web/src/lib/email/types.ts
├── ResendEmailProvider           providers/resend.ts   (HTTP API)
├── SmtpEmailProvider             providers/smtp.ts     (nodemailer — Zoho/SES/any SMTP)
├── LogEmailProvider              providers/log.ts      (logs, never sends — dev)
└── NoopEmailProvider             core.ts               (silent — default, unconfigured)
```

Selection (`OWY_EMAIL_PROVIDER`, or auto-detect from credentials):

| `OWY_EMAIL_PROVIDER` | Effect                                                        |
| -------------------- | ------------------------------------------------------------- |
| unset / `auto`       | Resend if `RESEND_API_KEY`, else SMTP if `SMTP_*`, else noop  |
| `resend`             | Force Resend (warns + noops if key missing)                   |
| `smtp`               | Force SMTP (warns + noops if `SMTP_HOST/USER/PASS` missing)   |
| `log`                | Log-only (never sends) — safe for staging                     |
| `none`               | Silent no-op                                                  |

Sends are **best-effort** (never block/throw into a user action), **retried** on
429/5xx/network (3 attempts, linear backoff), **gated** (verified address +
per-user preference), and **deduplicated** (a `(recipient, dedupKey)` email is
sent at most once, via the `email_deliveries` ledger).

## Provider comparison

| Criterion            | Zoho Mail SMTP        | Zoho ZeptoMail            | Resend               | Brevo (ex-Sendinblue) | Amazon SES           |
| -------------------- | --------------------- | ------------------------- | -------------------- | --------------------- | -------------------- |
| Purpose              | Human mailboxes       | **Transactional**         | **Transactional**    | Marketing+transac.    | Transactional (raw)  |
| Free tier            | Mailbox plan quota    | 10,000 one-time credit    | 3,000/mo (100/day)   | 300/day forever       | Pay-as-you-go        |
| Price after free     | Mailbox subscription  | ~$2.50 / 10k (PAYG)       | $20/mo (50k)         | from ~$9/mo           | $0.10 / 1k           |
| SMTP                 | ✅                    | ✅ (`smtp.zeptomail.eu`)  | ✅                   | ✅                    | ✅                   |
| HTTP API             | ❌                    | ✅                        | ✅                   | ✅                    | ✅                   |
| Delivery webhooks    | ❌                    | ✅ (bounce/open/click)    | ✅                   | ✅                    | ✅ (via SNS)         |
| Templates            | ❌                    | ✅                        | ✅                   | ✅                    | ❌ (bring your own)  |
| DKIM/SPF/DMARC       | ✅ (domain in Zoho)   | ✅                        | ✅                   | ✅                    | ✅                   |
| EU data residency    | ✅ (zoho.eu)          | ✅ (EU DC)                | ⚠️ US-based          | ✅ (EU/France)        | ✅ (eu-west-1)       |
| Ops complexity       | Low                   | Low                       | Lowest (great DX)    | Low                   | Higher (IAM/SNS)     |
| Transactional policy | Discouraged by Zoho   | Transactional-only ✅     | Any                  | Any                   | Any                  |

Notes: Zoho's own usage policy steers transactional mail to **ZeptoMail**, not
Zoho Mail. Zoho Mail SMTP is built for a person's inbox — it has per-mailbox
daily caps, shares your mailbox's sending reputation, and offers no bounce/
complaint webhooks or per-message tracking.

## The five questions

1. **Can ordinary Zoho Mail SMTP do the app's transactional email?**
   Technically **yes** — our `SmtpEmailProvider` sends through it fine — but it's
   **not recommended**. Zoho Mail is a mailbox product: daily sending limits,
   shared human-inbox reputation, no webhooks, no tracking, and Zoho's policy
   points transactional mail at ZeptoMail. Acceptable only as a stop-gap at
   trivial volume.
2. **What's missing vs Resend?** Bounce/complaint **webhooks**, event tracking,
   template management, suppression lists, higher throughput, and a clean HTTP
   API. Deliverability tooling is weaker.
3. **Is ZeptoMail a better equivalent?** **Yes.** It is Zoho's dedicated
   transactional product — the closest match to Resend: SMTP **and** HTTP API,
   webhooks, templates, EU data centre, and it reuses the **existing
   gestionatech.de Zoho domain auth**. Pricing is effectively free at our volume
   (10k credit, then ~$2.50/10k, no monthly fee).
4. **Best free/inexpensive choice for OWY now?** **ZeptoMail** — EU-resident,
   transactional-only, reuses our Zoho domain, near-zero cost. If a *permanent*
   free tier is preferred over a one-time credit, **Brevo** (300/day forever, EU
   company) is the runner-up. **Resend** wins on DX if volume stays < 100/day.
5. **Can the abstraction support multiple providers?** **Yes — already does.**
   ZeptoMail plugs straight into `SmtpEmailProvider` (below); Resend is native;
   a dedicated ZeptoMail HTTP provider can be added later behind the same
   `EmailProvider` interface with no change to calling code.

## Decision

**Recommended: Zoho ZeptoMail over SMTP.** It's EU-resident (GDPR), reuses the
domain we already authenticate with Zoho, is transactional-by-policy, and costs
essentially nothing at our volume — while giving us webhooks and templates if we
grow. No code change is needed: point the SMTP env at ZeptoMail.

> Not wired in production yet — **no email credentials are configured on the
> server** (`RESEND_API_KEY` / `SMTP_*` are unset), so the app currently runs the
> **noop** provider: in-app notifications work, email is silently skipped. This
> is the one manual step remaining to turn on email (see below).

## Production setup

### Option A — ZeptoMail (recommended)

1. Create a ZeptoMail account, add domain **gestionatech.de**, verify DKIM.
2. Create a "Mail Agent" and a **Send Mail token** (SMTP password).
3. Add to `apps/web/.env.local` (server only, never commit):

   ```ini
   OWY_EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.zeptomail.eu
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=emailapikey            # ZeptoMail's fixed SMTP username
   SMTP_PASS=<the send-mail token>
   OWY_EMAIL_FROM=Once Was Yours <info@gestionatech.de>
   ```
4. `sudo systemctl restart oncewasyours` and send a test offer.

### Option B — Resend

```ini
OWY_EMAIL_PROVIDER=resend
RESEND_API_KEY=<re_...>
OWY_EMAIL_FROM=Once Was Yours <info@gestionatech.de>
```

### DNS records (sending domain: gestionatech.de)

All three records live on the domain's DNS. gestionatech.de is already on Zoho,
so SPF/DKIM for Zoho exist; add the provider's specifics:

- **SPF** (TXT `@`): include the provider.
  - ZeptoMail: `v=spf1 include:zeptomail.eu ~all` (merge with existing Zoho include).
  - Resend: `v=spf1 include:amazonses.com ~all` (per Resend's dashboard).
- **DKIM** (CNAME/TXT): copy the exact selector record the provider shows after
  you add the domain (ZeptoMail: `zmail._domainkey…`; Resend: `resend._domainkey…`).
- **DMARC** (TXT `_dmarc`): start monitoring, then tighten:
  `v=DMARC1; p=none; rua=mailto:dmarc@gestionatech.de; fo=1`
  → move to `p=quarantine` once DKIM/SPF pass consistently.

Verify alignment after setup at [mail-tester.com](https://www.mail-tester.com/)
or Google Postmaster Tools.

## Env reference

| Var                  | Required when            | Notes                                             |
| -------------------- | ------------------------ | ------------------------------------------------- |
| `OWY_EMAIL_PROVIDER` | optional                 | `resend`\|`smtp`\|`log`\|`none`\|`auto` (default) |
| `RESEND_API_KEY`     | provider=resend/auto     | `re_...`                                          |
| `SMTP_HOST`          | provider=smtp/auto       | e.g. `smtp.zeptomail.eu`                          |
| `SMTP_PORT`          | optional                 | default `465`                                     |
| `SMTP_SECURE`        | optional                 | default: true on 465, else STARTTLS               |
| `SMTP_USER`          | provider=smtp            | ZeptoMail: `emailapikey`                          |
| `SMTP_PASS`          | provider=smtp            | send-mail token / SMTP password                   |
| `OWY_EMAIL_FROM`     | optional                 | default `Once Was Yours <info@gestionatech.de>`   |

Sources: [ZeptoMail pricing](https://www.zoho.com/zeptomail/pricing.html) ·
[ZeptoMail usage policy](https://www.zoho.com/zeptomail/terms.html) ·
[Zoho Mail rates & limits](https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html) ·
[Resend quotas & limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
