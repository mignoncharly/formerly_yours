// RLS / behavior suite for feature flags (Phase 11 §11.6).
//
//   - flags are world-readable but not client-writable;
//   - feature_flag_enabled() fails closed (unknown/disabled => false) and honors
//     enabled + rollout_percent;
//   - evaluation is deterministic for a given (flag, subject).
//
// Uses a throwaway flag created/removed via the service role (feature_flags is
// not user-scoped, so it must clean up after itself).
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, rest } from "./helpers.mjs";

const FLAG = `sectest_flag_${Math.random().toString(36).slice(2, 8)}`;

async function evalFlag(auth, subject) {
  const res = await rest(auth, "rpc/feature_flag_enabled", {
    method: "POST",
    body: JSON.stringify({ flag_key: FLAG, subject: subject ?? null }),
  });
  assert.equal(res.status, 200, "rpc status");
  return res.json();
}

async function setFlag(patch) {
  await rest("service", `feature_flags?key=eq.${FLAG}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

describe("feature flags RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  before(async () => {
    await rest("service", "feature_flags", {
      method: "POST",
      body: JSON.stringify({ key: FLAG, description: "sectest", enabled: false, rollout_percent: 0 }),
    });
  });

  after(async () => {
    await rest("service", `feature_flags?key=eq.${FLAG}`, { method: "DELETE" });
  });

  test("flags are readable by anonymous", async () => {
    const res = await rest("anon", `feature_flags?key=eq.${FLAG}&select=key,enabled`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).length, 1);
  });

  test("anonymous CANNOT insert a flag", async () => {
    const res = await rest("anon", "feature_flags", {
      method: "POST",
      body: JSON.stringify({ key: "hax", description: "x" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });

  test("anonymous CANNOT update a flag", async () => {
    const res = await rest("anon", `feature_flags?key=eq.${FLAG}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ enabled: true, rollout_percent: 100 }),
    });
    // Either rejected outright, or allowed through but affecting no rows.
    if (res.status === 200) assert.deepEqual(await res.json(), []);
    else assert.ok(res.status === 401 || res.status === 403, `got ${res.status}`);
  });

  test("unknown flag evaluates false", async () => {
    const res = await rest("anon", "rpc/feature_flag_enabled", {
      method: "POST",
      body: JSON.stringify({ flag_key: "does_not_exist_anywhere", subject: null }),
    });
    assert.equal(await res.json(), false);
  });

  test("disabled flag evaluates false", async () => {
    assert.equal(await evalFlag("anon", "00000000-0000-0000-0000-000000000001"), false);
  });

  test("enabled at 100% evaluates true and is deterministic", async () => {
    await setFlag({ enabled: true, rollout_percent: 100 });
    const subj = "00000000-0000-0000-0000-000000000042";
    const a = await evalFlag("anon", subj);
    const b = await evalFlag("anon", subj);
    assert.equal(a, true);
    assert.equal(b, true, "same subject => same result");
  });

  test("enabled at 0% evaluates false", async () => {
    await setFlag({ enabled: true, rollout_percent: 0 });
    assert.equal(await evalFlag("anon", "00000000-0000-0000-0000-000000000042"), false);
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] feature flags RLS suite targeting ${host}`);
}
