// Production readiness self-check — a read-only go/no-go report. Verifies the
// live domain, TLS, Stripe mode + webhook, email config + DNS auth, legal pages,
// and required env. Prints ✓ / ⚠ / ✗ and exits non-zero if any ✗ (blocker).
//
//   node scripts/readiness-check.mjs [https://oncewasyours.com]
//
// Reads config from apps/web/.env.local. Never prints secrets.
import { readFileSync, existsSync } from "node:fs";
import { resolveTxt } from "node:dns/promises";

const BASE = (process.argv[2] || "https://oncewasyours.com").replace(/\/$/, "");

const env = {};
const envPath = "apps/web/.env.local";
if (existsSync(envPath)) {
  for (const l of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = l.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i > -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
}

const results = [];
const ok = (name, msg) => results.push({ sev: "ok", name, msg });
const warn = (name, msg) => results.push({ sev: "warn", name, msg });
const fail = (name, msg) => results.push({ sev: "fail", name, msg });

async function httpStatus(path) {
  try {
    const r = await fetch(BASE + path, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    return r.status;
  } catch (e) { return `ERR(${e.code || e.message})`; }
}
async function txt(name) { try { return (await resolveTxt(name)).map((a) => a.join("")); } catch { return []; } }

// --- Domain + TLS ---
const root = await httpStatus("/");
if (root === 200) ok("domain", `${BASE} → 200 (TLS ok)`);
else fail("domain", `${BASE}/ → ${root}`);

// --- Legal pages ---
for (const p of ["/terms", "/privacy", "/impressum", "/withdrawal"]) {
  const s = await httpStatus(p);
  if (s === 200) ok(`legal ${p}`, "200"); else fail(`legal ${p}`, String(s));
}
try {
  const imp = await (await fetch(BASE + "/impressum", { signal: AbortSignal.timeout(10000) })).text();
  if (/\[your full name\]|\[legal entity|\[registered address/i.test(imp)) fail("legal placeholders", "unfilled [placeholder] found");
  else ok("legal placeholders", "none");
} catch { warn("legal placeholders", "could not fetch /impressum"); }

// --- Required env ---
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]) {
  if (env[k]) ok(`env ${k}`, "set"); else fail(`env ${k}`, "MISSING");
}

// --- Stripe mode + webhook ---
const sk = env.STRIPE_SECRET_KEY || "";
if (sk.startsWith("sk_live")) ok("stripe mode", "LIVE");
else if (sk.startsWith("sk_test")) warn("stripe mode", "TEST — not taking real payments");
else fail("stripe mode", "no/invalid key");
if (sk.startsWith("sk_")) {
  try {
    const r = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
      headers: { Authorization: `Bearer ${sk}` }, signal: AbortSignal.timeout(10000),
    });
    const b = await r.json();
    const eps = (b.data || []).filter((w) => (w.url || "").includes(new URL(BASE).host) && w.status === "enabled");
    if (eps.length) ok("stripe webhook", `enabled endpoint at ${new URL(BASE).host}`);
    else warn("stripe webhook", `no enabled endpoint pointing at ${new URL(BASE).host}`);
  } catch (e) { warn("stripe webhook", `API check failed: ${e.message}`); }
}

// --- Email config + DNS auth (sending domain from OWY_EMAIL_FROM) ---
const provider = (env.OWY_EMAIL_PROVIDER || "auto").toLowerCase();
const hasSmtp = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS;
if (provider === "smtp" && hasSmtp) ok("email provider", `smtp (${env.SMTP_HOST})`);
else if (env.RESEND_API_KEY) ok("email provider", "resend");
else if (hasSmtp) ok("email provider", `smtp (${env.SMTP_HOST})`);
else warn("email provider", "none configured — email disabled");

const fromMatch = (env.OWY_EMAIL_FROM || "").match(/@([^>\s]+)/);
const mailDomain = fromMatch ? fromMatch[1] : null;
if (mailDomain) {
  const spf = (await txt(mailDomain)).find((r) => r.startsWith("v=spf1"));
  if (!spf) fail(`email SPF (${mailDomain})`, "no SPF record");
  else if (/smtp|zeptomail|zoho|amazonses/i.test(spf)) ok(`email SPF (${mailDomain})`, "includes a sender");
  else warn(`email SPF (${mailDomain})`, `SPF present but may not authorise the sender: ${spf}`);

  const dmarc = (await txt(`_dmarc.${mailDomain}`)).find((r) => r.startsWith("v=DMARC1"));
  if (!dmarc) fail(`email DMARC (${mailDomain})`, "no DMARC record");
  else ok(`email DMARC (${mailDomain})`, /p=quarantine|p=reject/.test(dmarc) ? "enforcing" : "p=none (monitoring)");

  const dkim = (await txt(`zmail._domainkey.${mailDomain}`));
  if (dkim.length) ok(`email DKIM (${mailDomain})`, "zmail selector published");
  else warn(`email DKIM (${mailDomain})`, "zmail selector not found — verify the exact ZeptoMail selector/host");
}

// --- Report ---
const icon = { ok: "✓", warn: "⚠", fail: "✗" };
const pad = Math.max(...results.map((r) => r.name.length));
console.log(`\nProduction readiness — ${BASE}\n${"─".repeat(48)}`);
for (const r of results) console.log(`${icon[r.sev]}  ${r.name.padEnd(pad)}  ${r.msg}`);
const fails = results.filter((r) => r.sev === "fail").length;
const warns = results.filter((r) => r.sev === "warn").length;
console.log(`${"─".repeat(48)}\n${fails} blocker(s), ${warns} warning(s).`);
process.exit(fails > 0 ? 1 : 0);
