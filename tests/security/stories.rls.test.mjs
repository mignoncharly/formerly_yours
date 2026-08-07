// RLS security suite for the story engine (Phase 4, §2.5/§4).
//
//   - draft stories are private; only PUBLISHED stories are public;
//   - only the seller who owns a listing may author its story;
//   - anon/other users cannot create or edit someone's story;
//   - reactions & comments are owner-scoped; you can't act as another user;
//   - you cannot comment on a story you can't see (draft).
//
// Ephemeral users; deleting them cascades to listings → stories → reactions/comments.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

async function svcInsert(table, body) {
  const res = await rest("service", table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const rows = await res.json();
  return rows[0];
}

describe("story engine RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let userA, userB, tokenA, tokenB;
  let listing1, listing3, story1, story2;

  before(async () => {
    userA = await createUser();
    userB = await createUser();
    tokenA = await signIn(userA);
    tokenB = await signIn(userB);

    const now = new Date().toISOString();
    const mkListing = () =>
      svcInsert("listings", {
        seller_id: userA.id,
        category_id: 1,
        condition: "good",
        price_amount: 1000,
        title: "story test item",
        status: "active",
        published_at: now,
      });

    listing1 = await mkListing(); // has a PUBLISHED story
    const listing2 = await mkListing(); // has a DRAFT story
    listing3 = await mkListing(); // has NO story (for insert tests)

    story1 = await svcInsert("stories", {
      listing_id: listing1.id,
      author_id: userA.id,
      body: "A published story about the item.",
      published_at: now,
    });
    story2 = await svcInsert("stories", {
      listing_id: listing2.id,
      author_id: userA.id,
      body: "An unpublished draft story.",
    });
  });

  after(async () => {
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  test("a PUBLISHED story is visible to anonymous", async () => {
    const res = await rest("anon", `stories?id=eq.${story1.id}&select=id`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).length, 1);
  });

  test("a DRAFT story is NOT visible to anonymous", async () => {
    const res = await rest("anon", `stories?id=eq.${story2.id}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("a DRAFT story is NOT visible to another user", async () => {
    const res = await rest(tokenB, `stories?id=eq.${story2.id}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("anonymous CANNOT create a story", async () => {
    const res = await rest("anon", "stories", {
      method: "POST",
      body: JSON.stringify({ listing_id: listing3.id, author_id: userA.id, body: "x" }),
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).code, "42501");
  });

  test("user B CANNOT author a story for user A's listing", async () => {
    const res = await rest(tokenB, "stories", {
      method: "POST",
      body: JSON.stringify({ listing_id: listing3.id, author_id: userB.id, body: "spoof" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("user B CANNOT update user A's story", async () => {
    const res = await rest(tokenB, `stories?id=eq.${story1.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ body: "hijacked" }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "B's update must affect no rows");
  });

  test("user B CAN react to a published story", async () => {
    const res = await rest(tokenB, "story_reactions", {
      method: "POST",
      body: JSON.stringify({ story_id: story1.id, user_id: userB.id, reaction: "tea" }),
    });
    assert.equal(res.status, 201);
  });

  test("user B CANNOT react as user A", async () => {
    const res = await rest(tokenB, "story_reactions", {
      method: "POST",
      body: JSON.stringify({ story_id: story1.id, user_id: userA.id, reaction: "savage" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("user B CAN comment on a published story", async () => {
    const res = await rest(tokenB, "comments", {
      method: "POST",
      body: JSON.stringify({ story_id: story1.id, author_id: userB.id, body: "nice" }),
    });
    assert.equal(res.status, 201);
  });

  test("user B CANNOT comment on a story they can't see (draft)", async () => {
    const res = await rest(tokenB, "comments", {
      method: "POST",
      body: JSON.stringify({ story_id: story2.id, author_id: userB.id, body: "peeking" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("user B CANNOT comment as user A", async () => {
    const res = await rest(tokenB, "comments", {
      method: "POST",
      body: JSON.stringify({ story_id: story1.id, author_id: userA.id, body: "impersonation" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] story engine RLS suite targeting ${host}`);
}
