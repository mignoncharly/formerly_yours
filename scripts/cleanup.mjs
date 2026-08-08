// Retention / data-minimisation cleanup. Idempotent and CONSERVATIVE: it only
// removes transient, derived, or already-consumed rows — never listings, stories,
// orders, payments, offers, messages or profiles. Safe to run repeatedly.
//
// What it prunes (all configurable via env):
//   - read notifications older than OWY_NOTIF_RETENTION_DAYS (default 90). These
//     are derived from source events (offers/sales/…) and already seen.
//   - email_deliveries audit rows older than OWY_EMAIL_LEDGER_RETENTION_DAYS
//     (default 180). The dedup window has long passed.
//   - stripe_events audit rows older than OWY_STRIPE_EVENTS_RETENTION_DAYS
//     (default 180). Stripe stops retrying long before this.
//
// Connection: reads password + project_id from the git-ignored secrets file
// (default docs/supabase_sentry_keys.md) via the IPv4 session pooler. Nothing
// secret touches the command line or the logs. Run:
//   OWY_SECRETS_FILE=docs/supabase_sentry_keys.md node scripts/cleanup.mjs
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

const SECRETS_FILE = process.env.OWY_SECRETS_FILE ?? "docs/supabase_sentry_keys.md";
const NOTIF_DAYS = Number(process.env.OWY_NOTIF_RETENTION_DAYS ?? 90);
const EMAIL_DAYS = Number(process.env.OWY_EMAIL_LEDGER_RETENTION_DAYS ?? 180);
const STRIPE_DAYS = Number(process.env.OWY_STRIPE_EVENTS_RETENTION_DAYS ?? 180);

function parseKV(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > -1) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function resolveConnection() {
  if (process.env.SUPABASE_DB_URL) return { connectionString: process.env.SUPABASE_DB_URL };
  if (!existsSync(SECRETS_FILE)) throw new Error(`secrets file not found: ${SECRETS_FILE}`);
  const kv = parseKV(SECRETS_FILE);
  if (!kv.project_id || !kv.supabase_password) {
    throw new Error("could not resolve project_id / supabase_password");
  }
  return {
    host: process.env.SUPABASE_DB_HOST ?? `aws-1-${kv.project_region ?? "eu-west-1"}.pooler.supabase.com`,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user: process.env.SUPABASE_DB_USER ?? `postgres.${kv.project_id}`,
    password: kv.supabase_password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

const ts = () => new Date().toISOString();

async function main() {
  const client = new pg.Client({ ...resolveConnection(), connectionTimeoutMillis: 20000 });
  await client.connect();
  try {
    await client.query("begin");
    const notif = await client.query(
      `delete from public.notifications
       where read_at is not null and created_at < now() - ($1 || ' days')::interval`,
      [String(NOTIF_DAYS)],
    );
    const email = await client.query(
      `delete from public.email_deliveries
       where created_at < now() - ($1 || ' days')::interval`,
      [String(EMAIL_DAYS)],
    );
    const stripeEv = await client.query(
      `delete from public.stripe_events
       where processed_at < now() - ($1 || ' days')::interval`,
      [String(STRIPE_DAYS)],
    );
    await client.query("commit");
    console.log(
      `${ts()} cleanup OK: notifications=${notif.rowCount} (>${NOTIF_DAYS}d read), ` +
        `email_deliveries=${email.rowCount} (>${EMAIL_DAYS}d), ` +
        `stripe_events=${stripeEv.rowCount} (>${STRIPE_DAYS}d)`,
    );
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`${ts()} cleanup FAILED: ${err.message}`);
  process.exit(1);
});
