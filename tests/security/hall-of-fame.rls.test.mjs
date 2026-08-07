// RLS / behavior suite for the Hall of Fame (Phase 11 §11.3).
//
//   - the categories lookup is public-readable but not client-writable;
//   - the hall_of_fame() ranking only exposes OPTED-IN, PUBLISHED stories;
//   - opt-in is author-scoped: you can't opt someone else's story in/out.
//
// Ephemeral users; deleting them cascades to listings → stories → reactions.
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

async function hallOfFame(cat) {
  const res = await rest("anon", "rpc/hall_of_fame", {
    method: "POST",
    body: JSON.stringify({ cat_key: cat, lim: 200 }),
  });
  assert.equal(res.status, 200, `hall_of_fame(${cat}) status`);
  return res.json();
}

describe("hall of fame RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let userA, userB, tokenA, tokenB;
  let optedIn, notOptedIn, draftOptedIn;

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
        title: "hof test item",
        status: "active",
        published_at: now,
      });

    const [l1, l2, l3] = [await mkListing(), await mkListing(), await mkListing()];

    optedIn = await svcInsert("stories", {
      listing_id: l1.id,
      author_id: userA.id,
      body: "Published + opted in.",
      published_at: now,
      hall_of_fame_opt_in: true,
    });
    notOptedIn = await svcInsert("stories", {
      listing_id: l2.id,
      author_id: userA.id,
      body: "Published but NOT opted in.",
      published_at: now,
      hall_of_fame_opt_in: false,
    });
    draftOptedIn = await svcInsert("stories", {
      listing_id: l3.id,
      author_id: userA.id,
      body: "Opted in but unpublished draft.",
      hall_of_fame_opt_in: true,
    });

    // Give each story a reaction so the ranking's count > 0 filter can't be the
    // reason they're excluded — only opt-in + published should decide.
    for (const s of [optedIn, notOptedIn, draftOptedIn]) {
      await svcInsert("story_reactions", { story_id: s.id, user_id: userB.id, reaction: "tea" });
    }
  });

  after(async () => {
    if (userA) await deleteUser(userA.id);
    if (userB) await deleteUser(userB.id);
  });

  test("categories are readable by anonymous", async () => {
    const res = await rest("anon", "hall_of_fame_categories?select=key&is_active=eq.true");
    assert.equal(res.status, 200);
    assert.ok((await res.json()).length >= 5);
  });

  test("anonymous CANNOT insert a category", async () => {
    const res = await rest("anon", "hall_of_fame_categories", {
      method: "POST",
      body: JSON.stringify({ key: "hax", title: "x", blurb: "x" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });

  test("hall_of_fame includes an opted-in published story", async () => {
    const ids = (await hallOfFame("story_of_the_week")).map((r) => r.story_id);
    assert.ok(ids.includes(optedIn.id), "opted-in published story should rank");
  });

  test("hall_of_fame EXCLUDES a story that isn't opted in", async () => {
    const ids = (await hallOfFame("story_of_the_week")).map((r) => r.story_id);
    assert.ok(!ids.includes(notOptedIn.id), "non-opted-in story must not rank");
  });

  test("hall_of_fame EXCLUDES an opted-in but unpublished draft", async () => {
    const ids = (await hallOfFame("story_of_the_week")).map((r) => r.story_id);
    assert.ok(!ids.includes(draftOptedIn.id), "draft must not rank");
  });

  test("author CAN opt their own story in/out", async () => {
    const res = await rest(tokenA, `stories?id=eq.${notOptedIn.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ hall_of_fame_opt_in: true }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).length, 1, "author's update must affect the row");
    // revert so later assertions/other runs stay clean
    await rest(tokenA, `stories?id=eq.${notOptedIn.id}`, {
      method: "PATCH",
      body: JSON.stringify({ hall_of_fame_opt_in: false }),
    });
  });

  test("user B CANNOT opt user A's story in", async () => {
    const res = await rest(tokenB, `stories?id=eq.${optedIn.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ hall_of_fame_opt_in: false }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "B's update must affect no rows");
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] hall of fame RLS suite targeting ${host}`);
}
