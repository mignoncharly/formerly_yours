#!/usr/bin/env node
// Configure Supabase Auth URL + email settings as code (idempotent).
//
// Why this exists: the "confirmation link points to localhost" and branded
// email templates were originally set by hand in the Supabase dashboard, so
// they were undocumented and would be lost when the project keys are rotated
// at project end. This script makes that config reproducible and reviewable.
//
// It sets:
//   - site_url            -> the production origin (used by {{ .SiteURL }} in
//                            email templates, so confirm links never point at
//                            localhost regardless of where signup happened).
//   - uri_allow_list      -> prod + localhost dev redirect targets.
//   - confirmation / magic-link subjects + HTML templates (from ./supabase/auth/templates).
//
// Secrets are read from the environment — nothing is hard-coded or committed:
//   SUPABASE_ACCESS_TOKEN   Management API PAT (docs/supabase_sentry_keys.md -> "Supabase Management PAT")
//   SUPABASE_PROJECT_REF    project ref (defaults to the known dev/prod ref)
//   APP_URL                 production origin (defaults to the live domain)
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/configure-auth.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF ?? "xcsgsbtyumkqyjznesyy";
const APP_URL = (process.env.APP_URL ?? "https://oncewasyours.com").replace(/\/$/, "");

if (!PAT) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (Supabase Management PAT). Aborting.");
  process.exit(1);
}

const tpl = (name) =>
  readFileSync(join(repoRoot, "supabase/auth/templates", name), "utf8").trim();

const payload = {
  site_url: APP_URL,
  // `**` glob lets Supabase accept any path under these origins as a redirect.
  uri_allow_list: `${APP_URL}/**,http://localhost:3000/**`,
  mailer_subjects_confirmation: "Confirm your email — Once Was Yours",
  mailer_templates_confirmation_content: tpl("confirmation.html"),
  mailer_subjects_magic_link: "Your sign-in link — Once Was Yours",
  mailer_templates_magic_link_content: tpl("magic_link.html"),
};

const endpoint = `https://api.supabase.com/v1/projects/${REF}/config/auth`;

const res = await fetch(endpoint, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${PAT}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  console.error(`Auth config update failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

console.log("✓ Supabase Auth config applied");
console.log(`  site_url        = ${APP_URL}`);
console.log(`  uri_allow_list  = ${payload.uri_allow_list}`);
console.log("  templates       = confirmation.html, magic_link.html");
