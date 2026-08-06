// Fetch the Sentry project DSN via the API using the org auth token from the
// (git-ignored) docs/sentry_keys.md, and write Sentry env into apps/web/.env.local.
// Never prints secret values.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const keysFile = process.env.OWY_SENTRY_FILE ?? "docs/sentry_keys.md";
const text = readFileSync(keysFile, "utf8");

function val(re) {
  const m = text.match(re);
  return m ? m[1].trim() : "";
}
const org = val(/^org=(.+)$/m);
const token = val(/^token=(.+)$/m);
const project = val(/Project slugs?:\s*(.+)$/m) || "oncewasyours";

if (!org || !token || !project) {
  console.error("Could not parse org/token/project from", keysFile);
  process.exit(1);
}

const bases = ["https://us.sentry.io/api/0", "https://sentry.io/api/0"];
let dsn = "";
for (const base of bases) {
  try {
    const res = await fetch(`${base}/projects/${org}/${project}/keys/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error(`  ${base} -> HTTP ${res.status}`);
      continue;
    }
    const data = await res.json();
    dsn = data?.[0]?.dsn?.public ?? "";
    if (dsn) {
      console.log(`  DSN retrieved from ${base}`);
      break;
    }
  } catch (e) {
    console.error(`  ${base} -> ${e.message}`);
  }
}

if (!dsn) {
  console.error("Failed to retrieve DSN.");
  process.exit(1);
}

// Merge Sentry vars into apps/web/.env.local (replace existing keys).
const envPath = "apps/web/.env.local";
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const set = (k, v) => {
  const line = `${k}=${v}`;
  const re = new RegExp(`^${k}=.*$`, "m");
  env = re.test(env) ? env.replace(re, line) : env.replace(/\s*$/, "") + `\n${line}\n`;
};
set("NEXT_PUBLIC_SENTRY_DSN", dsn);
set("SENTRY_ORG", org);
set("SENTRY_PROJECT", project);
set("SENTRY_AUTH_TOKEN", token);
writeFileSync(envPath, env.endsWith("\n") ? env : env + "\n");
console.log("Sentry env written to apps/web/.env.local (values not printed).");
