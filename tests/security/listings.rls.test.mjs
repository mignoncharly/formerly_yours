// RLS security suite for the marketplace tables (Phase 3, §2.5/§2.6).
//
// Asserts the DB's authorization directly for listings / listing_images /
// saved_listings:
//   - anonymous & other users CANNOT create/edit/delete someone's listing;
//   - draft listings are private; only ACTIVE listings are public;
//   - a user can only add images to their OWN listing;
//   - a user can only read/write their OWN saved_listings.
//
// Ephemeral users are created via the admin API; deleting them cascades to
// their listings/images/saves. Skips cleanly when creds are absent.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

async function insertListing(auth, sellerId, extra = {}) {
  const res = await rest(auth, "listings", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ seller_id: sellerId, ...extra }),
  });
  return res;
}

describe("marketplace RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let draftId; // A's private draft
  let liveId; // A's active listing

  before(async () => {
    userA = await createUser();
    userB = await createUser();
    tokenA = await signIn(userA);
    tokenB = await signIn(userB);

    // A creates a private draft and a second listing we flip to active.
    const d = await insertListing(tokenA, userA.id, { title: "A private draft" });
    draftId = (await d.json())[0].id;

    const l = await insertListing(tokenA, userA.id, { title: "A live item" });
    liveId = (await l.json())[0].id;
    // Flip to active via service (publish path) so it is publicly visible.
    await rest("service", `listings?id=eq.${liveId}`, {
      method: "PATCH",
      body: JSON.stringify({
        category_id: 1,
        condition: "good",
        price_amount: 1000,
        status: "active",
        published_at: new Date().toISOString(),
      }),
    });
  });

  after(async () => {
    if (userA) await deleteUser(userA.id); // cascades to listings/images/saves
    if (userB) await deleteUser(userB.id);
  });

  test("authenticated user CAN create their own listing", async () => {
    const res = await insertListing(tokenA, userA.id, { title: "own insert" });
    assert.equal(res.status, 201);
  });

  test("anonymous CANNOT create a listing", async () => {
    const res = await insertListing("anon", userA.id, { title: "x" });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).code, "42501");
  });

  test("user A CANNOT create a listing owned by user B", async () => {
    const res = await insertListing(tokenA, userB.id, { title: "spoof" });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("a DRAFT listing is NOT visible to anonymous", async () => {
    const res = await rest("anon", `listings?id=eq.${draftId}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "draft must be private");
  });

  test("a DRAFT listing is NOT visible to another user", async () => {
    const res = await rest(tokenB, `listings?id=eq.${draftId}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "B must not see A's draft");
  });

  test("an ACTIVE listing IS visible to anonymous", async () => {
    const res = await rest("anon", `listings?id=eq.${liveId}&select=id,status`);
    assert.equal(res.status, 200);
    const rows = await res.json();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "active");
  });

  test("user B CANNOT update user A's listing", async () => {
    const res = await rest(tokenB, `listings?id=eq.${liveId}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ title: "hijacked by B" }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "B's update must affect no rows");
    const check = await rest("service", `listings?id=eq.${liveId}&select=title`);
    assert.notEqual((await check.json())[0].title, "hijacked by B");
  });

  test("user B CANNOT delete user A's listing", async () => {
    const res = await rest(tokenB, `listings?id=eq.${liveId}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "B's delete must affect no rows");
    const check = await rest("service", `listings?id=eq.${liveId}&select=id`);
    assert.equal((await check.json()).length, 1, "A's listing must still exist");
  });

  test("user B CANNOT attach an image to user A's listing", async () => {
    const res = await rest(tokenB, "listing_images", {
      method: "POST",
      body: JSON.stringify({ listing_id: liveId, storage_path: `${userB.id}/x/y.webp` }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("user A CAN save a listing; user B canNOT read A's saves", async () => {
    const save = await rest(tokenA, "saved_listings", {
      method: "POST",
      body: JSON.stringify({ user_id: userA.id, listing_id: liveId }),
    });
    assert.equal(save.status, 201);

    const bReads = await rest(tokenB, `saved_listings?user_id=eq.${userA.id}&select=listing_id`);
    assert.equal(bReads.status, 200);
    assert.deepEqual(await bReads.json(), [], "B must not read A's saves");
  });

  test("user B CANNOT insert a save as user A", async () => {
    const res = await rest(tokenB, "saved_listings", {
      method: "POST",
      body: JSON.stringify({ user_id: userA.id, listing_id: liveId }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] marketplace RLS suite targeting ${host}`);
}
