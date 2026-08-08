// RLS suite for notification_preferences + email_deliveries (retention #2).
//
//   - a user reads/writes ONLY their own preference row;
//   - a user CANNOT create/read another user's preferences;
//   - a user CANNOT forge a row under someone else's user_id (WITH CHECK);
//   - email_deliveries is service-role only — no client can read or write it.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

describe("notification_preferences RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let userA, userB, tokenA, tokenB;

  before(async () => {
    userA = await createUser();
    userB = await createUser();
    tokenA = await signIn(userA);
    tokenB = await signIn(userB);
  });

  after(async () => {
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  test("a user can create their own preference row", async () => {
    const res = await rest(tokenA, "notification_preferences", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userA.id, email_offers: false }),
    });
    const body = await res.json();
    assert.equal(res.status, 201, JSON.stringify(body));
    const [row] = body;
    assert.equal(row.email_offers, false);
    assert.equal(row.email_enabled, true); // default
  });

  test("a user CANNOT create a row under another user's id (WITH CHECK)", async () => {
    const res = await rest(tokenB, "notification_preferences", {
      method: "POST",
      body: JSON.stringify({ user_id: userA.id, email_enabled: false }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });

  test("a user CANNOT read another user's preferences", async () => {
    const res = await rest(tokenB, `notification_preferences?user_id=eq.${userA.id}&select=user_id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("a user can update their own preferences", async () => {
    const res = await rest(tokenA, `notification_preferences?user_id=eq.${userA.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ email_enabled: false }),
    });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    const [row] = body;
    assert.equal(row.email_enabled, false);
  });

  test("a user CANNOT update another user's preferences", async () => {
    const res = await rest(tokenB, `notification_preferences?user_id=eq.${userA.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ email_enabled: true }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []); // matched no rows it's allowed to touch
  });

  test("anonymous reads no preferences", async () => {
    const res = await rest("anon", "notification_preferences?select=user_id");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("email_deliveries is invisible to clients (no policies)", async () => {
    const resAuth = await rest(tokenA, "email_deliveries?select=id");
    assert.equal(resAuth.status, 200);
    assert.deepEqual(await resAuth.json(), []);

    const resAnon = await rest("anon", "email_deliveries?select=id");
    assert.equal(resAnon.status, 200);
    assert.deepEqual(await resAnon.json(), []);
  });

  test("a client CANNOT insert into email_deliveries", async () => {
    const res = await rest(tokenA, "email_deliveries", {
      method: "POST",
      body: JSON.stringify({ to_address: "x@y.com", dedup_key: "forged" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] notification_preferences RLS suite targeting ${host}`);
}
