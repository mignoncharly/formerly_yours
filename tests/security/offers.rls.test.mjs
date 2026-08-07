// RLS + secure-function suite for messaging & offers (Phase 8, §8).
//
//   - offers: only the buyer opens negotiation on an active listing, no spoofing,
//     only the two parties read it;
//   - accept/counter are authorized to the RECIPIENT only; accept is ATOMIC
//     (accept → invalidate other pending → reserve the listing);
//   - conversations/messages are members-only.
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

describe("offers & messaging RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let seller, buyer, other, tS, tB, tO, listing, offer1, offer2, offer3;

  before(async () => {
    seller = await createUser();
    buyer = await createUser();
    other = await createUser();
    tS = await signIn(seller);
    tB = await signIn(buyer);
    tO = await signIn(other);
    listing = await svcInsert("listings", {
      seller_id: seller.id,
      category_id: 1,
      condition: "good",
      price_amount: 70000,
      title: "offer test item",
      status: "active",
      published_at: new Date().toISOString(),
    });
  });

  after(async () => {
    if (seller) await deleteUser(seller.id);
    if (buyer) await deleteUser(buyer.id);
    if (other) await deleteUser(other.id);
  });

  test("a buyer CAN make an offer on an active listing", async () => {
    const res = await rest(tB, "offers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        listing_id: listing.id,
        buyer_id: buyer.id,
        seller_id: seller.id,
        proposed_by: buyer.id,
        amount: 61000,
      }),
    });
    assert.equal(res.status, 201);
    offer1 = (await res.json())[0];
  });

  test("anonymous CANNOT make an offer", async () => {
    const res = await rest("anon", "offers", {
      method: "POST",
      body: JSON.stringify({
        listing_id: listing.id,
        buyer_id: buyer.id,
        seller_id: seller.id,
        proposed_by: buyer.id,
        amount: 100,
      }),
    });
    assert.equal(res.status, 401);
  });

  test("a buyer CANNOT spoof the buyer_id", async () => {
    const res = await rest(tB, "offers", {
      method: "POST",
      body: JSON.stringify({
        listing_id: listing.id,
        buyer_id: other.id,
        seller_id: seller.id,
        proposed_by: other.id,
        amount: 100,
      }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("a third party CANNOT read the offer", async () => {
    const res = await rest(tO, `offers?id=eq.${offer1.id}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "O must not see the B<->S offer");
  });

  test("the proposer CANNOT accept their own offer", async () => {
    const res = await rest(tB, "rpc/accept_offer", {
      method: "POST",
      body: JSON.stringify({ in_offer: offer1.id }),
    });
    assert.ok(res.status >= 400, `expected error, got ${res.status}`);
    const check = await rest("service", `offers?id=eq.${offer1.id}&select=status`);
    assert.equal((await check.json())[0].status, "pending");
  });

  test("a second buyer makes an offer, then the seller counters the first", async () => {
    offer2 = await svcInsert("offers", {
      listing_id: listing.id,
      buyer_id: other.id,
      seller_id: seller.id,
      proposed_by: other.id,
      amount: 60000,
    });
    // seller (recipient of offer1) counters
    const res = await rest(tS, "rpc/counter_offer", {
      method: "POST",
      body: JSON.stringify({ in_offer: offer1.id, new_amount: 65000 }),
    });
    assert.ok(res.status >= 200 && res.status < 300, `expected 2xx, got ${res.status}`);
    offer3 = { id: await res.json() };
    const o1 = await rest("service", `offers?id=eq.${offer1.id}&select=status`);
    assert.equal((await o1.json())[0].status, "declined", "countered offer is declined");
    const o3 = await rest("service", `offers?id=eq.${offer3.id}&select=proposed_by,status`);
    const row = (await o3.json())[0];
    assert.equal(row.status, "pending");
    assert.equal(row.proposed_by, seller.id, "counter is proposed by the seller");
  });

  test("accepting the counter is ATOMIC: reserve listing + invalidate others", async () => {
    // buyer is the recipient of the seller's counter (offer3)
    const res = await rest(tB, "rpc/accept_offer", {
      method: "POST",
      body: JSON.stringify({ in_offer: offer3.id }),
    });
    assert.ok(res.status >= 200 && res.status < 300, `expected 2xx, got ${res.status}`);

    const o3 = await rest("service", `offers?id=eq.${offer3.id}&select=status`);
    assert.equal((await o3.json())[0].status, "accepted");
    const o2 = await rest("service", `offers?id=eq.${offer2.id}&select=status`);
    assert.equal((await o2.json())[0].status, "declined", "other pending offer invalidated");
    const l = await rest("service", `listings?id=eq.${listing.id}&select=status`);
    assert.equal((await l.json())[0].status, "reserved", "listing reserved");
  });

  // --- messaging ---
  let conv;

  test("a buyer CAN start a conversation; seller & buyer are members", async () => {
    const res = await rest(tB, "rpc/start_conversation", {
      method: "POST",
      body: JSON.stringify({ in_listing: listing.id }),
    });
    assert.ok(res.status >= 200 && res.status < 300, `expected 2xx, got ${res.status}`);
    conv = await res.json();
    assert.ok(typeof conv === "string" && conv.length > 0);
  });

  test("a member CAN send a message", async () => {
    const res = await rest(tB, "messages", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conv, sender_id: buyer.id, body: "is this still available?" }),
    });
    assert.equal(res.status, 201);
  });

  test("a non-member CANNOT read the messages", async () => {
    const res = await rest(tO, `messages?conversation_id=eq.${conv}&select=id`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [], "O is not a member");
  });

  test("a non-member CANNOT send a message", async () => {
    const res = await rest(tO, "messages", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conv, sender_id: other.id, body: "intruding" }),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
    assert.equal((await res.json()).code, "42501");
  });

  test("you cannot start a conversation with yourself", async () => {
    const res = await rest(tS, "rpc/start_conversation", {
      method: "POST",
      body: JSON.stringify({ in_listing: listing.id }),
    });
    assert.ok(res.status >= 400, `expected error, got ${res.status}`);
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] offers & messaging RLS suite targeting ${host}`);
}
