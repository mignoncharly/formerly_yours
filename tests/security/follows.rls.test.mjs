// RLS security suite for public.follows (Phase 5, §5.6).
//
//   - the follow graph is publicly readable;
//   - a user can only create/remove their OWN follow edges;
//   - you can't spoof another user's follow;
//   - the DB rejects self-follows (CHECK constraint).
//
// Ephemeral users; deleting them cascades to their follows.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

describe("follows RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
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

  test("anonymous CANNOT create a follow", async () => {
    const res = await rest("anon", "follows", {
      method: "POST",
      body: JSON.stringify({ follower_id: userA.id, followed_id: userB.id }),
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).code, "42501");
  });

  test("user A CAN follow user B", async () => {
    const res = await rest(tokenA, "follows", {
      method: "POST",
      body: JSON.stringify({ follower_id: userA.id, followed_id: userB.id }),
    });
    assert.equal(res.status, 201);
  });

  test("user A CANNOT create a follow as user B", async () => {
    const res = await rest(tokenA, "follows", {
      method: "POST",
      body: JSON.stringify({ follower_id: userB.id, followed_id: userA.id }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("the follow graph is readable by anonymous", async () => {
    const res = await rest("anon", `follows?follower_id=eq.${userA.id}&select=followed_id`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).length, 1);
  });

  test("user B CANNOT delete user A's follow", async () => {
    const res = await rest(tokenB, `follows?follower_id=eq.${userA.id}&followed_id=eq.${userB.id}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "B's delete must affect no rows");
    const check = await rest("service", `follows?follower_id=eq.${userA.id}&select=followed_id`);
    assert.equal((await check.json()).length, 1, "A's follow must still exist");
  });

  test("self-follow is rejected by the DB", async () => {
    const res = await rest(tokenA, "follows", {
      method: "POST",
      body: JSON.stringify({ follower_id: userA.id, followed_id: userA.id }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, "23514"); // check_violation
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] follows RLS suite targeting ${host}`);
}
