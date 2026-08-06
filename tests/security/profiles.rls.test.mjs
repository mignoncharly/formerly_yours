// RLS security suite for public.profiles (§2.5/§2.6).
//
// Asserts the DB's authorization directly:
//   - anonymous can READ public profiles, but CANNOT write;
//   - a user can edit ONLY their own row (self-update, self-insert with-check);
//   - user A cannot edit user B.
//
// Requires the live dev project + service key (apps/web/.env.local). If those
// are absent (e.g. CI without secrets) the whole suite skips rather than fails.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

describe("profiles RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let userA;
  let userB;
  let tokenA;

  before(async () => {
    userA = await createUser();
    userB = await createUser();
    tokenA = await signIn(userA);
  });

  after(async () => {
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  test("bootstrap trigger created a profile row for each new user", async () => {
    const res = await rest("service", `profiles?id=eq.${userA.id}&select=id`);
    assert.equal(res.status, 200);
    const rows = await res.json();
    assert.equal(rows.length, 1, "expected a bootstrapped profile for user A");
  });

  test("anonymous CAN read public profiles", async () => {
    const res = await rest("anon", "profiles?select=id,username&limit=1");
    assert.equal(res.status, 200);
  });

  test("anonymous CANNOT insert a profile", async () => {
    const res = await rest("anon", "profiles", {
      method: "POST",
      body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000", username: `x${Date.now()}` }),
    });
    assert.equal(res.status, 401, "anon insert must be rejected by RLS");
    const body = await res.json();
    assert.equal(body.code, "42501");
  });

  test("anonymous CANNOT update a profile", async () => {
    const res = await rest("anon", `profiles?id=eq.${userA.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ display_name: "hacked-by-anon" }),
    });
    // RLS gives anon no UPDATE grant → either forbidden, or 0 rows affected.
    if (res.status === 200) {
      assert.deepEqual(await res.json(), [], "anon update must affect no rows");
    } else {
      assert.ok(res.status === 401 || res.status === 403, `unexpected ${res.status}`);
    }
    // Confirm untouched.
    const check = await rest("service", `profiles?id=eq.${userA.id}&select=display_name`);
    assert.notEqual((await check.json())[0].display_name, "hacked-by-anon");
  });

  test("user A CAN update their OWN profile", async () => {
    const res = await rest(tokenA, `profiles?id=eq.${userA.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ display_name: "A owns this" }),
    });
    assert.equal(res.status, 200);
    const rows = await res.json();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].display_name, "A owns this");
  });

  test("user A CANNOT edit user B's profile", async () => {
    const res = await rest(tokenA, `profiles?id=eq.${userB.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ display_name: "A tampering with B" }),
    });
    // RLS USING clause filters B's row out of A's update scope → 0 rows.
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "A's update must not touch B's row");
    const check = await rest("service", `profiles?id=eq.${userB.id}&select=display_name`);
    assert.notEqual((await check.json())[0].display_name, "A tampering with B");
  });

  test("user A CANNOT insert a profile row owned by someone else", async () => {
    const res = await rest(tokenA, "profiles", {
      method: "POST",
      body: JSON.stringify({ id: userB.id, username: `evil${Date.now()}` }),
    });
    // with-check violation is rejected (403 for an authed caller, 401 for anon).
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });
});

// Surface the target so an accidental run against prod is obvious.
if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] profiles RLS suite targeting ${host}`);
}
