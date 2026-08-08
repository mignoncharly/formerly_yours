// RLS suite for stripe_events (payment webhook idempotency ledger).
//
//   - service-role only: no authenticated or anonymous client can read or write
//     it. The webhook route (service client) owns all writes.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

describe("stripe_events RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let user, token;

  before(async () => {
    user = await createUser();
    token = await signIn(user);
  });

  after(async () => {
    if (user) await deleteUser(user.id);
  });

  test("authenticated client reads nothing", async () => {
    const res = await rest(token, "stripe_events?select=id");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("anonymous client reads nothing", async () => {
    const res = await rest("anon", "stripe_events?select=id");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("a client CANNOT insert an event", async () => {
    const res = await rest(token, "stripe_events", {
      method: "POST",
      body: JSON.stringify({ id: "evt_forged", type: "checkout.session.completed" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });

  test("the service role CAN write + dedupe on event id", async () => {
    const id = `evt_test_${Math.random().toString(36).slice(2, 10)}`;
    const first = await rest("service", "stripe_events", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id, type: "checkout.session.completed" }),
    });
    assert.equal(first.status, 201, await first.text());

    // Second insert of the same id must violate the primary key (idempotency).
    const dup = await rest("service", "stripe_events", {
      method: "POST",
      body: JSON.stringify({ id, type: "checkout.session.completed" }),
    });
    assert.equal(dup.status, 409, `expected 409 conflict, got ${dup.status}`);

    // Cleanup.
    await rest("service", `stripe_events?id=eq.${id}`, { method: "DELETE" });
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] stripe_events RLS suite targeting ${host}`);
}
