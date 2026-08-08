// Minimal, dependency-free Sentry event sender for server-side cron jobs.
//
// Usage:
//   node scripts/sentry-notify.mjs "message" [level]
//   echo "detail" | node scripts/sentry-notify.mjs "message" error
//
// level: fatal|error|warning|info (default: error). Reads the DSN from
// NEXT_PUBLIC_SENTRY_DSN or SENTRY_DSN. A no-op (exit 0) when no DSN is set, so
// jobs never fail just because Sentry isn't configured. Never prints the DSN.
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  // Cron runs without the app's env; pull the DSN from the git-ignored .env.local.
  const out = { ...process.env };
  for (const file of ["apps/web/.env.local", ".env.local"]) {
    try {
      for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const i = t.indexOf("=");
        if (i === -1) continue;
        const k = t.slice(0, i).trim();
        if (!(k in out)) out[k] = t.slice(i + 1).trim();
      }
    } catch {
      /* file may not exist */
    }
  }
  return out;
}

const env = loadEnvLocal();
const dsn = env.NEXT_PUBLIC_SENTRY_DSN || env.SENTRY_DSN || "";
if (!dsn) {
  console.log("[sentry-notify] no DSN configured — skipping");
  process.exit(0);
}

const message = process.argv[2] || "cron job alert";
const level = process.argv[3] || "error";
let extraDetail = "";
try {
  extraDetail = readFileSync(0, "utf8").slice(0, 4000); // optional stdin
} catch {
  /* no stdin */
}

// DSN: https://<publicKey>@<host>/<projectId>
let publicKey, host, projectId;
try {
  const u = new URL(dsn);
  publicKey = u.username;
  host = u.host;
  projectId = u.pathname.replace(/\//g, "");
} catch {
  console.error("[sentry-notify] malformed DSN");
  process.exit(0);
}

const event = {
  event_id: crypto.randomUUID().replace(/-/g, ""),
  timestamp: new Date().toISOString(),
  platform: "node",
  level,
  logger: "cron",
  server_name: env.HOSTNAME || "oncewasyours",
  environment: env.NODE_ENV || "production",
  message: { formatted: extraDetail ? `${message}\n\n${extraDetail}` : message },
  tags: { source: "server-cron" },
};

const envelope =
  JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString(), dsn }) +
  "\n" +
  JSON.stringify({ type: "event" }) +
  "\n" +
  JSON.stringify(event) +
  "\n";

const url = `https://${host}/api/${projectId}/envelope/`;
try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=owy-cron/1.0, sentry_key=${publicKey}`,
    },
    body: envelope,
    signal: AbortSignal.timeout(10_000),
  });
  console.log(`[sentry-notify] sent (${res.status})`);
} catch (err) {
  console.error(`[sentry-notify] failed: ${err?.message ?? err}`);
}
