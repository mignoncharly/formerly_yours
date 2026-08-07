# Phase 4 — Story Engine

**Goal:** the product's real differentiator — a listing can carry ONE story that
says WHY the object is being sold. `story ≠ listing`: a story can be hidden
without pulling the item, and identity visibility is independent of story tone.

Branch: `feature/phase-4-story-engine`.

## Schema (migrations 0009–0010, applied to dev)

- **`relationship_contexts`** — structured "why" (10 seeded: cheated_on, ghosted,
  wedding_cancelled, divorce, moving_out, terrible_gift, what_was_i_thinking,
  at_least_they_had_taste, peaceful_goodbye, other), with `is_sensitive` flags.
- **`stories`** — one per listing (`listing_id` unique). `mode` (clean_break /
  little_tea / full_story) and `visibility` (public / limited / anonymous) are
  independent. Public only once `published_at` is set. **`original_input`** keeps
  the user's own words for audit; `ai_assisted` flags AI use.
- **`story_relationship_contexts`** — N:N (a story can be divorce + moving_out).
- **`story_reactions`** — signature reactions, one per user/story.
- **`comments`** — one reply level (enforced app-side).
- `story_is_visible()` + `story_reaction_counts()` RPCs.

RLS on every table: published stories public; authors control their own; a story
can only be authored by the seller who owns the listing; reactions/comments are
owner-scoped; you can't comment on a story you can't see.

## App

- **`/sell/[id]/story`** — editor: relationship contexts (max 3) → story mode +
  identity visibility → write.
- **AI Story Assistant (§4.3/§4.4)** — `apps/web/src/lib/ai/story.ts`. Uses the
  **OpenAI** SDK (`gpt-4o-mini` by default, override `OWY_AI_MODEL`); polish
  actions: shorter / witty / classy / playful. A strict **no-invention** system
  prompt — it only rephrases the user's words, never adds events, names, or
  motives. The raw input is retained in `stories.original_input`. Gated on
  `OPENAI_API_KEY`: with no key the buttons hide and it's "your words" only.
- **`/story/[slug]-[shortId]`** — hero image, headline, body, relationship tags,
  **signature reactions**, the linked item **respecting identity visibility**
  (anonymous → "Anonymous", limited → "A seller", public → name), **comments**
  (1-level replies, edit/delete own), and **share** (Copy link, WhatsApp, X,
  Facebook, Reddit) + OpenGraph/Twitter card metadata.

## Definition of Done (impl plan "Sortie Phase 4")

- [x] a user can sell an object **and** tell why it exists on the platform
- [x] structured relationship context + story mode + identity visibility
- [x] AI assistant that rephrases without inventing (original input retained)
- [x] shareable story page with reactions and comments

## Verification

- `pnpm typecheck` + `pnpm build` green.
- Server-verified vs the live dev DB: publish → story renders, relationship tags,
  reactions RPC, identity-visibility seller line, linked item, comments post/read.
- `pnpm test:security` — **29/29** (profiles 7 + marketplace 11 + story engine 11):
  draft stories private, only the listing owner authors its story, reactions and
  comments owner-scoped, no commenting on a story you can't see.

## Not in scope (later phases)

Report & block (need the trust & safety tables — Phase 7); human moderation queue
(Phase 7 — stories publish straight to visible for now); a dedicated OpenGraph
image route (currently metadata only); TikTok/Instagram share cards (§4.8, later).
