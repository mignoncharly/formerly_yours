// RLS security suite for the Next Chapter tables (Phase 6, §6).
//
//   - only PUBLIC chapters are public; limited/anonymous are owner-only;
//   - only the owner creates/edits a chapter;
//   - you can only link YOUR listing to YOUR chapter;
//   - only the owner posts updates; updates follow chapter visibility.
//
// Ephemeral users; deleting them cascades to chapters → links/updates.
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

describe("next chapter RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let userA, userB, tokenA, tokenB;
  let chPub, chLim, listingA;

  before(async () => {
    userA = await createUser();
    userB = await createUser();
    tokenA = await signIn(userA);
    tokenB = await signIn(userB);

    chPub = await svcInsert("next_chapters", {
      owner_id: userA.id,
      title: "Public chapter",
      visibility: "public",
    });
    chLim = await svcInsert("next_chapters", {
      owner_id: userA.id,
      title: "Limited chapter",
      visibility: "limited",
    });
    listingA = await svcInsert("listings", {
      seller_id: userA.id,
      category_id: 1,
      condition: "good",
      price_amount: 1000,
      title: "chapter test item",
      status: "active",
      published_at: new Date().toISOString(),
    });
    await svcInsert("chapter_updates", { chapter_id: chPub.id, author_id: userA.id, body: "pub update" });
    await svcInsert("chapter_updates", { chapter_id: chLim.id, author_id: userA.id, body: "lim update" });
  });

  after(async () => {
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  test("a PUBLIC chapter is visible to anonymous", async () => {
    const res = await rest("anon", `next_chapters?id=eq.${chPub.id}&select=id`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).length, 1);
  });

  test("a LIMITED chapter is NOT visible to anonymous", async () => {
    const res = await rest("anon", `next_chapters?id=eq.${chLim.id}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });

  test("anonymous CANNOT create a chapter", async () => {
    const res = await rest("anon", "next_chapters", {
      method: "POST",
      body: JSON.stringify({ owner_id: userA.id, title: "x" }),
    });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).code, "42501");
  });

  test("user B CANNOT create a chapter owned by user A", async () => {
    const res = await rest(tokenB, "next_chapters", {
      method: "POST",
      body: JSON.stringify({ owner_id: userA.id, title: "spoof" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("user B CANNOT update user A's chapter", async () => {
    const res = await rest(tokenB, `next_chapters?id=eq.${chPub.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ title: "hijacked" }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "B's update must affect no rows");
  });

  test("user B CANNOT link user A's listing to a chapter", async () => {
    const res = await rest(tokenB, "listing_chapters", {
      method: "POST",
      body: JSON.stringify({ listing_id: listingA.id, chapter_id: chPub.id }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("user B CANNOT post an update to user A's chapter", async () => {
    const res = await rest(tokenB, "chapter_updates", {
      method: "POST",
      body: JSON.stringify({ chapter_id: chPub.id, author_id: userB.id, body: "intruding" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("owner CAN post an update to their own chapter", async () => {
    const res = await rest(tokenA, "chapter_updates", {
      method: "POST",
      body: JSON.stringify({ chapter_id: chPub.id, author_id: userA.id, body: "mine" }),
    });
    assert.equal(res.status, 201);
  });

  test("updates on a PUBLIC chapter are readable by anonymous", async () => {
    const res = await rest("anon", `chapter_updates?chapter_id=eq.${chPub.id}&select=id`);
    assert.equal(res.status, 200);
    assert.ok((await res.json()).length >= 1);
  });

  test("updates on a LIMITED chapter are NOT readable by anonymous", async () => {
    const res = await rest("anon", `chapter_updates?chapter_id=eq.${chLim.id}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] next chapter RLS suite targeting ${host}`);
}
