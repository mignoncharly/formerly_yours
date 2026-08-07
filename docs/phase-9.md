# Phase 9 — Stripe Connect

**Goal:** money enters. Real payments via Stripe Connect (destination charges),
confirmed only by a verified webhook, with an immutable financial ledger.

Branch: `feature/phase-9-stripe-connect`.

## Schema (migrations 0017–0018, applied to dev)

- **`private.seller_accounts`** — Stripe connected account id + `payouts_enabled`.
- **`fee_rules`** (dynamic, §9.5) + **`compute_fees()`** — 7% seller fee, 3% buyer
  protection (basis points, not hardcoded).
- **`orders` / `order_items`** (public, party-read RLS), **`private.payments /
  payouts / refunds`**, and an append-only **`private.ledger_entries`** (§9.6) —
  progress and balances are always *derived*, never a stored counter.
- **Money mutation functions** (SECURITY DEFINER, **service_role only**): the
  browser never confirms payment (§9.2).
  - `create_pending_order` — validate active listing + seller payouts, compute
    fees, create order/item/payment(pending) + ledger `order`, **reserve** the
    listing.
  - `confirm_order_paid` (the webhook path) — **idempotent**: payment succeeded →
    order paid → listing sold → ledger (payment / platform_fee / buyer_protection
    / seller_receivable) → `chapter_contribution` if the listing funds a chapter.
  - seller onboarding fns.
  - `0018` fixes a leak: Supabase default-privileges grant EXECUTE to
    anon/authenticated, so these had to be revoked from those roles explicitly.

## App

- **`/account/payouts`** — seller Stripe Connect Express onboarding + status.
- **`Buy now`** on the listing page → `create_pending_order` → Stripe Checkout
  (**destination charge**, `application_fee = platform_fee + buyer_protection`,
  transfer to the seller's connected account) → `/orders`.
- **`/api/stripe/webhook`** — signature-verified, idempotent; the only place a
  payment is confirmed.
- **`/orders`** — the buyer's/seller's orders with status.

## Definition of Done (impl plan "Sortie Phase 9")

- [x] seller onboarding (connected account → KYC → payouts)
- [x] payment lifecycle server-side, browser never confirms
- [x] signature-verified idempotent webhook
- [x] order state machine (pending_payment → paid → …)
- [x] dynamic fees + immutable ledger + financial invariant
- [ ] **first Stripe TEST purchase** — needs the interactive setup below

## Setup to run a test purchase (interactive)

1. `apps/web/.env.local` has the **sandbox** `STRIPE_SECRET_KEY` /
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (already wired). Set `STRIPE_WEBHOOK_SECRET`:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   copy the `whsec_...` into `STRIPE_WEBHOOK_SECRET`, restart the app.
2. Sign in, go to `/account/payouts`, complete Stripe **test** onboarding (use
   Stripe's test data) until payouts are enabled.
3. As a **different** account, open a listing from that seller → **Buy now** →
   pay with test card `4242 4242 4242 4242`. The webhook flips the order to
   **paid** and the listing to **sold**.

## Verification

- `pnpm typecheck` + `pnpm build` green.
- `pnpm test:security` — **74/74** (adds **payments & ledger 6**): money functions
  service-role only, fee math, financial invariant (§9.7), idempotent confirm,
  order RLS.

## Not in scope (later)

Shipping labels + shipment tracking + disputes + payout delay (Phase 10); refunds
/ chargebacks wired to the ledger; `account.updated` webhook (onboarding return
refresh covers status for now).
