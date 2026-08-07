// Money-flow suite for payments/orders/ledger (Phase 9, §9).
//
//   - the money mutation functions are service-role only;
//   - create_pending_order validates + reserves + computes fees;
//   - confirm_order_paid (the webhook path) is idempotent → order paid + sold;
//   - the financial invariant holds (§9.7): total = seller_net + fees;
//   - orders are readable by their two parties only.
//
// No real Stripe: we call the SECURITY DEFINER functions directly as the service
// role, exactly as the checkout action + webhook do.
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, haveCreds, createUser, signIn, deleteUser, rest } from "./helpers.mjs";

async function svc(pathAndQuery, init) {
  return rest("service", pathAndQuery, init);
}
async function svcRpc(fn, args) {
  return svc(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
}
async function svcInsert(table, body) {
  const res = await svc(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  return (await res.json())[0];
}

describe("payments & ledger", { skip: haveCreds() ? false : "no Supabase creds (.env.local)" }, () => {
  let seller, buyer, other, tB, tO, listing, orderId;

  before(async () => {
    seller = await createUser();
    buyer = await createUser();
    other = await createUser();
    tB = await signIn(buyer);
    tO = await signIn(other);

    // enable payouts for the seller (as the onboarding/webhook would)
    await svcRpc("upsert_seller_stripe_account", { in_user: seller.id, in_account: "acct_test_" + seller.id.slice(0, 8) });
    await svcRpc("set_seller_payouts", { in_user: seller.id, in_enabled: true, in_kyc: "submitted" });

    listing = await svcInsert("listings", {
      seller_id: seller.id,
      category_id: 1,
      condition: "good",
      price_amount: 70000,
      title: "payment test item",
      status: "active",
      published_at: new Date().toISOString(),
    });
  });

  after(async () => {
    // orders reference profiles (no cascade) — remove them before the users.
    await svc(`orders?seller_id=eq.${seller.id}`, { method: "DELETE" });
    if (seller) await deleteUser(seller.id);
    if (buyer) await deleteUser(buyer.id);
    if (other) await deleteUser(other.id);
  });

  test("the money functions are service-role only (anon cannot call)", async () => {
    const res = await rest("anon", "rpc/create_pending_order", {
      method: "POST",
      body: JSON.stringify({ in_listing: listing.id, in_buyer: buyer.id }),
    });
    assert.ok(res.status >= 400, `anon must not run create_pending_order (got ${res.status})`);
  });

  test("create_pending_order computes fees, reserves the listing", async () => {
    const res = await svcRpc("create_pending_order", { in_listing: listing.id, in_buyer: buyer.id });
    assert.equal(res.status, 200);
    orderId = (await res.json())[0].order_id;

    const o = (await (await svc(`orders?id=eq.${orderId}&select=*`)).json())[0];
    assert.equal(o.subtotal_amount, 70000);
    assert.equal(o.seller_fee_amount, 4900); // 7%
    assert.equal(o.buyer_fee_amount, 2100); // 3%
    assert.equal(o.total_amount, 72100); // subtotal + buyer protection
    assert.equal(o.status, "pending_payment");

    const l = (await (await svc(`listings?id=eq.${listing.id}&select=status`)).json())[0];
    assert.equal(l.status, "reserved");
  });

  test("financial invariant: total = seller_net + platform_fee + buyer_protection (§9.7)", async () => {
    const o = (await (await svc(`orders?id=eq.${orderId}&select=*`)).json())[0];
    const sellerNet = o.subtotal_amount - o.seller_fee_amount;
    assert.equal(sellerNet + o.seller_fee_amount + o.buyer_fee_amount, o.total_amount);
  });

  test("order is readable by buyer, not by a third party", async () => {
    const b = await rest(tB, `orders?id=eq.${orderId}&select=id`);
    assert.equal((await b.json()).length, 1);
    const o = await rest(tO, `orders?id=eq.${orderId}&select=id`);
    assert.deepEqual(await o.json(), []);
  });

  test("confirm_order_paid (webhook path) marks paid + sold, and is idempotent", async () => {
    await svcRpc("attach_payment_session", { in_order: orderId, in_session: "cs_test_123" });
    const r1 = await svcRpc("confirm_order_paid", { in_session: "cs_test_123", in_intent: "pi_test_123" });
    assert.ok(r1.status >= 200 && r1.status < 300, `confirm failed: ${r1.status}`);

    let o = (await (await svc(`orders?id=eq.${orderId}&select=status`)).json())[0];
    assert.equal(o.status, "paid");
    const l = (await (await svc(`listings?id=eq.${listing.id}&select=status`)).json())[0];
    assert.equal(l.status, "sold");

    // idempotent replay
    const r2 = await svcRpc("confirm_order_paid", { in_session: "cs_test_123", in_intent: "pi_test_123" });
    assert.ok(r2.status >= 200 && r2.status < 300);
    o = (await (await svc(`orders?id=eq.${orderId}&select=status`)).json())[0];
    assert.equal(o.status, "paid", "still paid, no double processing");
  });

  test("cannot buy your own listing", async () => {
    const l2 = await svcInsert("listings", {
      seller_id: seller.id,
      category_id: 1,
      condition: "good",
      price_amount: 1000,
      title: "self buy",
      status: "active",
      published_at: new Date().toISOString(),
    });
    const res = await svcRpc("create_pending_order", { in_listing: l2.id, in_buyer: seller.id });
    assert.ok(res.status >= 400, "must not create an order for your own listing");
  });
});

if (haveCreds()) {
  const host = new URL(CONFIG.url).host;
  console.log(`[security] payments & ledger suite targeting ${host}`);
}
