# Phase 10 — Shipping + Disputes

**Goal:** the order lifecycle after payment — provider-agnostic shipping, a state
machine, and buyer disputes. Result: a **real usable C2C marketplace**.

Branch: `feature/phase-10-shipping-disputes`.

## Schema (migration 0020, applied to dev)

- **enums** `shipment_status` (label_created → delivered / exception / lost /
  returned) and `dispute_reason` (item_never_arrived / different_item /
  major_damage / counterfeit / other).
- **`shipments`** (one per order, provider-agnostic) + **`shipping_events`** log.
- **`disputes`** (order-scoped; evidence upload later). RLS: order parties + staff.
- **State-machine functions** (SECURITY DEFINER, actor-checked, `authenticated`):
  `mark_shipped` (seller → creates shipment, order `shipped`), `mark_delivered`
  (party → `delivered`), `complete_order` (buyer confirms → `completed`, records
  the payout ledger marker), `open_dispute` (buyer → dispute + order `disputed`).

## App

- **`ShippingProvider`** abstraction (`lib/shipping.ts`, §10.2) with a mock
  provider so the flow works end-to-end in test; a real carrier plugs in later.
- **`/orders/[id]`** — order detail with the buyer/seller fee breakdown, shipment
  status, dispute banner, and the context-aware lifecycle actions (Mark shipped /
  Mark delivered / Confirm receipt / Open a dispute). `/orders` links to it.

## Definition of Done (impl plan "Sortie Phase 10")

- [x] provider-agnostic shipping + shipment model
- [x] order state machine paid → shipped → delivered → completed
- [x] buyer disputes with private evidence field
- [x] a real usable C2C marketplace

## Verification

- `pnpm typecheck` + `pnpm build` green.
- `pnpm test:security` — **81/81** (adds **shipping & disputes 7**): only the
  seller ships, only the buyer confirms/disputes, shipments & disputes are
  parties-only, the state machine advances correctly.

## Not in scope / simplified

- **Payout delay (§10.5):** with destination charges the seller is paid at charge
  time, so `complete_order` records a payout *marker* rather than releasing funds.
  A held-payout window (separate charges/transfers, or manual payouts) is a future
  refinement — flagged in the plan as "to validate legally & technically".
- **Launch geography (§10.1):** single-country assumptions (shipping/tax) are not
  yet enforced in code.
- Real carrier integration, shipping-label PDFs, dispute evidence upload, and
  refunds/chargebacks wired to the ledger.
