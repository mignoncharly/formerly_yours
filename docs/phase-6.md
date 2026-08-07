# Phase 6 — Fund My Next Chapter

**Goal:** the second differentiator — a real sale funds the seller's future. The
conceptual loop closes: **PAST → OBJECT → STORY → SALE intention → NEXT CHAPTER**.

Branch: `feature/phase-6-next-chapter`.

## Schema (migration 0012, applied to dev)

- **`next_chapters`** (blueprint §15) — a funding goal (title, description,
  `target_amount` in minor units, visibility, status). **`is_simulated`** flags
  that progress is a simulation until real payments exist (Phase 9).
- **`listing_chapters`** (blueprint §16) — a listing funds at most one chapter
  (`listing_id` PK).
- **`chapter_updates`** (blueprint §18) — "What happened next?".
- **`chapter_progress()`** RPC (§17) — progress is **derived**, never stored:
  `raised = sum(price)` and `items_sold = count` of **SOLD** linked listings.
  `chapter_contributions` (§17, keyed by `order_item_id`) is deferred to Phase 8/9
  when transactions exist.

RLS: only PUBLIC chapters are public (limited/anonymous are owner-only); only the
owner creates/edits a chapter; you can only link YOUR listing to YOUR chapter;
only the owner posts updates, which follow chapter visibility.

## App

- **`/chapters`** — create a chapter (title templates: Solo Trip, New Home, Fresh
  Start, Study, Start a Business, Savings, Something New; target, description,
  visibility) + your chapters with live derived progress.
- **`/sell`** — each listing has a "Fund a chapter…" picker (§6.2 "Where should
  this money go?") that links/unlinks it to one of your chapters.
- **`/chapter/[slug]-[shortId]`** — public chapter page: progress bar
  (`raised / target`), item count, the SOLD items that funded it (✓ title €price),
  a **Simulation** badge, and **"What happened next"** updates (owner can post).

## Definition of Done (impl plan "Sortie Phase 6")

- [x] the conceptual loop exists: PAST → OBJECT → STORY → SALE intention → NEXT CHAPTER
- [x] create a chapter and link listings to it
- [x] public chapter page with derived progress + funded items
- [x] "What happened next" updates
- [x] data clearly marked as simulation until real payments

## Verification

- `pnpm typecheck` + `pnpm build` green.
- Server-verified vs the live dev DB: `chapter_progress` derives raised/items_sold
  from sold linked listings; `/chapter` renders title, progress, funded items, and
  the Simulation badge; public/limited visibility respected.
- `pnpm test:security` — **45/45** (profiles 7 + marketplace 11 + story 11 +
  follows 6 + chapters 10).

## Not in scope (later phases)

Real `chapter_contributions` from paid orders + refund-aware progress (Phase 8/9);
a "New Chapters" transformation feed section (§6.5, when there's enough content);
chapter update images upload; goal-completion flow.
