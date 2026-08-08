// Daily Stripe reconciliation — catches missed webhooks. Cross-checks every
// Stripe checkout session that Stripe considers PAID in the recent window
// against our own records (private.payments.status + orders.status). A session
// Stripe marks paid but we haven't recorded as 'succeeded' means the webhook was
// missed/failed — real money not reflected in the app. Read-only; alerts only.
//
//   node scripts/stripe-reconcile.mjs           (last 48h, or OWY_RECON_HOURS)
//
// Stripe key from apps/web/.env.local; DB via the IPv4 pooler using creds from
// the git-ignored secrets file. Never prints secrets. Exit non-zero on mismatch.
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

const HOURS = Number(process.env.OWY_RECON_HOURS ?? 48);
const SECRETS_FILE = process.env.OWY_SECRETS_FILE ?? "docs/supabase_sentry_keys.md";

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const l of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = l.trim(); if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("="); if (i > -1) out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return out;
}

const env = parseEnvFile("apps/web/.env.local");
const STRIPE_KEY = env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) { console.error("no STRIPE_SECRET_KEY"); process.exit(1); }

function dbConn() {
  const kv = parseEnvFile(SECRETS_FILE);
  if (!kv.project_id || !kv.supabase_password) throw new Error("cannot resolve DB creds");
  return {
    host: process.env.SUPABASE_DB_HOST ?? `aws-1-${kv.project_region ?? "eu-west-1"}.pooler.supabase.com`,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user: process.env.SUPABASE_DB_USER ?? `postgres.${kv.project_id}`,
    password: kv.supabase_password, database: "postgres", ssl: { rejectUnauthorized: false },
  };
}

// Pull recent Stripe checkout sessions that Stripe considers paid.
async function stripePaidSessions(sinceTs) {
  const paid = [];
  let startingAfter = null;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ limit: "100", "created[gte]": String(sinceTs) });
    if (startingAfter) params.set("starting_after", startingAfter);
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions?${params}`, {
      headers: { Authorization: `Bearer ${STRIPE_KEY}` }, signal: AbortSignal.timeout(15000),
    });
    const b = await r.json();
    if (b.error) throw new Error(`Stripe: ${b.error.message}`);
    for (const s of b.data) {
      if (s.payment_status === "paid") {
        paid.push({ id: s.id, intent: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id });
      }
    }
    if (!b.has_more) break;
    startingAfter = b.data[b.data.length - 1]?.id;
  }
  return paid;
}

const ts = () => new Date().toISOString();

async function main() {
  const since = Math.floor(Date.now() / 1000) - HOURS * 3600;
  const paid = await stripePaidSessions(since);

  const client = new pg.Client({ ...dbConn(), connectionTimeoutMillis: 20000 });
  await client.connect();
  const mismatches = [];
  try {
    for (const s of paid) {
      const { rows } = await client.query(
        `select p.status as pay_status, o.status as order_status, o.id as order_id
         from private.payments p join public.orders o on o.id = p.order_id
         where p.provider_session_id = $1`,
        [s.id],
      );
      if (rows.length === 0) {
        mismatches.push(`session ${s.id}: Stripe PAID but no payment record`);
      } else {
        const { pay_status, order_status, order_id } = rows[0];
        if (pay_status !== "succeeded" || order_status !== "paid") {
          mismatches.push(
            `order ${order_id}: Stripe PAID but payment=${pay_status}, order=${order_status} (missed webhook?)`,
          );
        }
      }
    }
  } finally {
    await client.end();
  }

  if (mismatches.length === 0) {
    console.log(`${ts()} reconcile OK: ${paid.length} paid session(s) in last ${HOURS}h, all reconciled`);
    process.exit(0);
  }
  console.error(`${ts()} reconcile MISMATCH: ${mismatches.length} of ${paid.length} paid session(s)`);
  for (const m of mismatches) console.error("  - " + m);
  process.exit(2);
}

main().catch((e) => { console.error(`${ts()} reconcile FAILED: ${e.message}`); process.exit(1); });
