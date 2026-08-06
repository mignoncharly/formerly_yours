// Test helpers for the RLS security suite (implementation plan §2.5/§2.6).
//
// These run against the LIVE dev Supabase project over the REST + Auth APIs —
// they assert the database's real authorization, not the UI. Ephemeral users
// are created via the admin API and deleted in teardown.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.resolve(HERE, "../../apps/web/.env.local");

function loadEnv() {
  const out = { ...process.env };
  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      if (!(k in out)) out[k] = t.slice(i + 1).trim();
    }
  }
  return out;
}

const env = loadEnv();

export const CONFIG = {
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  secretKey: env.SUPABASE_SECRET_KEY,
};

/** True when we have everything needed to talk to the dev project. */
export function haveCreds() {
  return Boolean(CONFIG.url && CONFIG.anonKey && CONFIG.secretKey);
}

const rand = () => Math.random().toString(36).slice(2, 10);

/** Create a confirmed ephemeral user via the admin API. Returns {id,email,password}. */
export async function createUser() {
  const email = `sectest+${rand()}@oncewasyours.test`;
  const password = `Pw-${rand()}${rand()}!`;
  const res = await fetch(`${CONFIG.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: CONFIG.secretKey,
      Authorization: `Bearer ${CONFIG.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    throw new Error(`createUser failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return { id: body.id, email, password };
}

/** Sign a user in (password grant) and return their access token (JWT). */
export async function signIn({ email, password }) {
  const res = await fetch(`${CONFIG.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: CONFIG.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`signIn failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).access_token;
}

/** Delete an ephemeral user (cascades to their profile row). */
export async function deleteUser(id) {
  await fetch(`${CONFIG.url}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: { apikey: CONFIG.secretKey, Authorization: `Bearer ${CONFIG.secretKey}` },
  });
}

/**
 * Call PostgREST on the `profiles` table.
 * @param {"anon"|"service"|string} auth - "anon", "service", or a user JWT.
 */
export async function rest(auth, pathAndQuery, init = {}) {
  const key = auth === "service" ? CONFIG.secretKey : CONFIG.anonKey;
  const bearer =
    auth === "service" ? CONFIG.secretKey : auth === "anon" ? CONFIG.anonKey : auth;
  return fetch(`${CONFIG.url}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}
