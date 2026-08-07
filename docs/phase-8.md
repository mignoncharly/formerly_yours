# Phase 8 — Messaging + Offers

**Goal:** a functional **negotiable** marketplace — buyer↔seller chat and
make/accept/decline/counter offers with an atomic accept. Still test-environment
(no real money until Phase 9).

Branch: `feature/phase-8-messaging-offers`.

## Schema (migrations 0015–0016, applied to dev)

- **`offers`** (blueprint §19 + counter) — `proposed_by` marks who made the offer;
  a counter is a new offer proposed by the other party (`parent_offer_id`). RLS:
  a buyer opens negotiation on an **active** listing (no spoofing); only the two
  parties read it.
- **`conversations` / `conversation_members` / `messages`** (blueprint §25-27) —
  members-only RLS via `is_conversation_member()`. **Realtime** enabled on
  `messages` (§8.2).
- **Secure functions:** `start_conversation` (find-or-create the thread),
  `accept_offer` (**ATOMIC**: accept → invalidate other pending offers → reserve
  the listing, §8.5), `decline_offer`, `withdraw_offer`, `counter_offer`. Each is
  authorized to the correct party. `0016` fixed a null-`auth.uid()` hole (anon
  comparison was `NULL`, not `TRUE`) and revoked anon EXECUTE.

## App

- **Listing page** — buyers get **Make an offer** (amount) and **Message seller**;
  sellers get a **Manage offers** link. "Keep payments on Once Was Yours for
  protection."
- **`/offers`** — your offers (buying & selling) with Accept / Decline / Counter
  (recipient) and Withdraw (proposer), through the secure functions.
- **`/messages` + `/messages/[id]`** — conversation list and a **realtime** thread
  (Supabase `postgres_changes`), with an on-platform **safety gate** blocking
  contact details / off-platform payment terms (§8.3). Bottom nav gains **Inbox**.

## Definition of Done (impl plan "Sortie Phase 8")

- [x] one conversation per buyer/listing, realtime chat, on-platform safety
- [x] make / accept / decline / counter offers
- [x] atomic accept → listing reserved + other offers invalidated
- [x] a functional negotiable marketplace (test environment)

## Verification

- `pnpm typecheck` + `pnpm build` green.
- `pnpm test:security` — **68/68** (… + **offers & messaging 12**): offer authz
  (buyer-only, no spoof, parties-only read), accept/counter recipient-only,
  atomic accept (reserve + invalidate), conversations/messages members-only, no
  self-conversation.

## Not in scope (later)

Checkout / real payments (Phase 9 — Stripe Connect); typing indicators & presence
(§8.2, optional); message attachments upload; offer expiry sweeps.
