# Auth email & deliverability

Sign-in / sign-up is passwordless (Supabase magic link / OTP, see `/sign-in`).
All account email is sent by **Supabase Auth through custom SMTP (Zoho, `smtp.zoho.eu`)**
as `OnceWasYours <info@gestionatech.de>`. The app itself sends no email.

## "Confirmation link points to localhost" — fixed

Root cause (historical): with Supabase's *default* email template the confirm
link is built from `{{ .ConfirmationURL }}`, which resolves to the `emailRedirectTo`
passed by the browser — so signing up from a `localhost:3000` dev session produced
a localhost link.

Current state (correct):
- **Site URL** = `https://oncewasyours.gestionatech.de`.
- Custom confirmation / magic-link templates link to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` — i.e. the
  production origin, independent of where signup happened.
- `/auth/confirm` verifies the `token_hash` and redirects using the request's own
  (production) origin.
- The sign-in client bases redirects on `NEXT_PUBLIC_APP_URL`, not
  `window.location.origin`.

This config lives in the Supabase project (source of truth). To reproduce it after
a key rotation, run:

```bash
SUPABASE_ACCESS_TOKEN=<Supabase Management PAT> node scripts/configure-auth.mjs
```

Templates are version-controlled in `supabase/auth/templates/`.

## "Confirmation link → 502 Bad Gateway" — nginx proxy buffers

On a *successful* confirmation, Supabase SSR sets the session as a large
`sb-<ref>-auth-token` cookie split across several `Set-Cookie` headers. nginx's
default `proxy_buffer_size` (8k) can't hold that response header block, so
`/auth/confirm` returns 502 with *"upstream sent too big header while reading
response header from upstream"* in `/var/log/nginx/error.log`. A bad/expired
token sets no cookie, so it redirects fine — only real confirmations 502.

Fix (server, one-time): enlarge the proxy buffers — see
`deploy/nginx-proxy-buffers.conf`:

```bash
sudo cp deploy/nginx-proxy-buffers.conf /etc/nginx/conf.d/proxy-buffers.conf
sudo nginx -t && sudo systemctl reload nginx
```

## "Signup email lands in junk" — deliverability posture

This is **not** an authentication misconfiguration. For `gestionatech.de`:

| Check | Status |
| --- | --- |
| SPF   | ✅ `v=spf1 include:zohomail.eu ~all` |
| DKIM  | ✅ `zmail._domainkey` — valid RSA key, aligned (`d=gestionatech.de`) |
| DMARC | ✅ present, `p=none` (aligned pass) |
| Custom SMTP | ✅ active (Zoho), sender on-domain |

Because SPF/DKIM/DMARC all pass and align, residual junk placement is driven by
**sender reputation** (new, low-volume domain) and HTML-only transactional content,
not by a broken record. Levers, in order of impact:

1. **Warm up the domain** — reputation builds with consistent, engaged sends. Early
   confirmations from a fresh domain are commonly filtered until recipients interact
   (open / "not spam" / reply). This resolves over time.
2. **Optional — tighten DMARC** to `p=quarantine` once every app sending as
   `gestionatech.de` is confirmed aligned. ⚠️ `gestionatech.de` is a shared org
   domain used by other live apps on the same box; this is an org-wide DNS change,
   so verify the others first. Do **not** change it unilaterally.
3. **Optional — dedicated sending identity** (e.g. `noreply@mail.oncewasyours.gestionatech.de`
   with its own SPF/DKIM in Zoho) isolates this app's reputation from the shared
   `info@` mailbox. Requires Zoho admin + DNS.

A preheader was added to the templates (minor content signal). There is no config
change that instantly moves a brand-new domain from junk to inbox — items 1–3 are
the real path.
