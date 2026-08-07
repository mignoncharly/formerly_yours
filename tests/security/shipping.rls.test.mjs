// Order lifecycle + disputes suite (Phase 10, §10).
//
//   - only the seller ships; only the buyer confirms receipt / disputes;
//   - shipments & disputes are readable by the order parties only;
//   - the state machine advances paid → shipped → delivered → completed.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

async function svc(p, init) {
  return rest("service", p, init);
}
async function svcRpc(fn, args) {
  return (await svc(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }));
}
async function svcInsert(table, body) {
  const res = await svc(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) });
  return (await res.json())[0];
}

async function paidOrder(sellerId, buyerId) {
  const listing = await svcInsert("listings", {
    seller_id: sellerId, category_id: 1, condition: "good",
    price_amount: 50000, title: "ship test item", status: "active",
    published_at: new Date().toISOString(),
  });
  const r = await svcRpc("create_pending_order", { in_listing: listing.id, in_buyer: buyerId });
  const orderId = (await r.json())[0].order_id;
  await svcRpc("attach_payment_session", { in_order: orderId, in_session: "cs_" + orderId });
  await svcRpc("confirm_order_paid", { in_session: "cs_" + orderId, in_intent: "pi_" + orderId });
  return orderId;
}

describe("shipping & disputes RLS", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let seller, buyer, other, tS, tB, tO, order1, order2;

  before(async () => {
    seller = await createUser();
    buyer = await createUser();
    other = await createUser();
    tS = await signIn(seller);
    tB = await signIn(buyer);
    tO = await signIn(other);
    await svcRpc("upsert_seller_stripe_account", { in_user: seller.id, in_account: "acct_ship_" + seller.id.slice(0, 8) });
    await svcRpc("set_seller_payouts", { in_user: seller.id, in_enabled: true, in_kyc: "submitted" });
    order1 = await paidOrder(seller.id, buyer.id);
    order2 = await paidOrder(seller.id, buyer.id);
  });

  after(async () => {
    await svc(`orders?seller_id=eq.${seller.id}`, { method: "DELETE" });
    if (seller) await deleteUser(seller.id);
    if (buyer) await deleteUser(buyer.id);
    if (other) await deleteUser(other.id);
  });

  test("only the seller can mark shipped", async () => {
    const asBuyer = await rest(tB, "rpc/mark_shipped", {
      method: "POST",
      body: JSON.stringify({ in_order: order1, in_tracking: "T1" }),
    });
    assert.ok(asBuyer.status >= 400, "buyer must not ship");
  });

  test("the seller ships → order shipped, shipment created", async () => {
    const res = await rest(tS, "rpc/mark_shipped", { method: "POST", body: JSON.stringify({ in_order: order1, in_tracking: "T1" }) });
    assert.ok(res.status >= 200 && res.status < 300, `ship failed: ${res.status}`);
    const o = (await (await svc(`orders?id=eq.${order1}&select=status`)).json())[0];
    assert.equal(o.status, "shipped");
    const s = (await (await svc(`shipments?order_id=eq.${order1}&select=status`)).json())[0];
    assert.equal(s.status, "label_created");
  });

  test("a third party cannot read the shipment", async () => {
    const res = await rest(tO, `shipments?order_id=eq.${order1}&select=status`);
    assert.deepEqual(await res.json(), []);
  });

  test("mark delivered → order delivered", async () => {
    const res = await rest(tB, "rpc/mark_delivered", { method: "POST", body: JSON.stringify({ in_order: order1 }) });
    assert.ok(res.status >= 200 && res.status < 300, `deliver failed: ${res.status}`);
    const o = (await (await svc(`orders?id=eq.${order1}&select=status`)).json())[0];
    assert.equal(o.status, "delivered");
  });

  test("only the buyer can confirm receipt", async () => {
    const asSeller = await rest(tS, "rpc/complete_order", { method: "POST", body: JSON.stringify({ in_order: order1 }) });
    assert.ok(asSeller.status >= 400, "seller must not confirm receipt");
    const res = await rest(tB, "rpc/complete_order", { method: "POST", body: JSON.stringify({ in_order: order1 }) });
    assert.ok(res.status >= 200 && res.status < 300, `complete failed: ${res.status}`);
    const o = (await (await svc(`orders?id=eq.${order1}&select=status`)).json())[0];
    assert.equal(o.status, "completed");
  });

  test("only the buyer can open a dispute", async () => {
    const asOther = await rest(tO, "rpc/open_dispute", { method: "POST", body: JSON.stringify({ in_order: order2, in_reason: "different_item" }) });
    assert.ok(asOther.status >= 400, "non-buyer must not dispute");
  });

  test("the buyer opens a dispute → order disputed, parties-only visible", async () => {
    const res = await rest(tB, "rpc/open_dispute", { method: "POST", body: JSON.stringify({ in_order: order2, in_reason: "item_never_arrived", in_details: "never came" }) });
    assert.ok(res.status >= 200 && res.status < 300, `dispute failed: ${res.status}`);
    const o = (await (await svc(`orders?id=eq.${order2}&select=status`)).json())[0];
    assert.equal(o.status, "disputed");

    const buyerReads = await rest(tB, `disputes?order_id=eq.${order2}&select=id`);
    assert.equal((await buyerReads.json()).length, 1);
    const otherReads = await rest(tO, `disputes?order_id=eq.${order2}&select=id`);
    assert.deepEqual(await otherReads.json(), []);
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] shipping & disputes suite targeting ${host}`);
}
