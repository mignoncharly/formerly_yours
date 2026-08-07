// RLS / behavior suite for notifications (retention #1).
//
//   - notifications are created by SYSTEM triggers (reaction/follow/…), not by
//     clients — a user can't forge one;
//   - a user can read ONLY their own; anon reads none;
//   - mark_notifications_read is scoped to the caller (can't clear someone else's).
//
// Ephemeral users; deleting them cascades to listings → stories → notifications.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

async function svcInsert(table, body) {
  const res = await rest("service", table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return (await res.json())[0];
}

describe("notifications RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let userA, userB, tokenA, tokenB, story;

  before(async () => {
    userA = await createUser();
    userB = await createUser();
    tokenA = await signIn(userA);
    tokenB = await signIn(userB);

    const now = new Date().toISOString();
    const listing = await svcInsert("listings", {
      seller_id: userA.id,
      category_id: 1,
      condition: "good",
      price_amount: 1000,
      title: "notif test item",
      status: "active",
      published_at: now,
    });
    story = await svcInsert("stories", {
      listing_id: listing.id,
      author_id: userA.id,
      body: "A published story.",
      published_at: now,
    });

    // userB reacts to + follows userA -> system triggers create notifications for A.
    await rest(tokenB, "story_reactions", {
      method: "POST",
      body: JSON.stringify({ story_id: story.id, user_id: userB.id, reaction: "savage" }),
    });
    await rest(tokenB, "follows", {
      method: "POST",
      body: JSON.stringify({ follower_id: userB.id, followed_id: userA.id }),
    });
  });

  after(async () => {
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  test("userA sees the system-generated notifications (reaction + follow)", async () => {
    const res = await rest(tokenA, `notifications?select=type,actor_id&order=created_at.desc`);
    assert.equal(res.status, 200);
    const types = (await res.json()).map((n) => n.type);
    assert.ok(types.includes("story_reaction"), "expected a story_reaction notification");
    assert.ok(types.includes("new_follower"), "expected a new_follower notification");
  });

  test("userB CANNOT read userA's notifications", async () => {
    const res = await rest(tokenB, `notifications?recipient_id=eq.${userA.id}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("anonymous reads no notifications", async () => {
    const res = await rest("anon", "notifications?select=id");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("a user CANNOT forge a notification", async () => {
    const res = await rest(tokenB, "notifications", {
      method: "POST",
      body: JSON.stringify({ recipient_id: userA.id, type: "sale" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });

  test("userB's mark-read does NOT clear userA's unread", async () => {
    await rest(tokenB, "rpc/mark_notifications_read", {
      method: "POST",
      body: JSON.stringify({ ids: null }),
    });
    const res = await rest(tokenA, "notifications?select=read_at");
    const rows = await res.json();
    assert.ok(rows.some((n) => n.read_at == null), "A should still have unread notifications");
  });

  test("userA can mark their own notifications read", async () => {
    const res = await rest(tokenA, "rpc/mark_notifications_read", {
      method: "POST",
      body: JSON.stringify({ ids: null }),
    });
    assert.equal(res.status, 200);
    assert.ok((await res.json()) >= 1, "should mark at least one read");
    const after = await (await rest(tokenA, "notifications?select=read_at")).json();
    assert.ok(after.every((n) => n.read_at != null), "all A's notifications now read");
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] notifications RLS suite targeting ${host}`);
}
