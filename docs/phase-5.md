# Phase 5 — Social Feed

**Goal:** content becomes the destination — a ranked feed of stories, following,
and real impression tracking, so we can measure engagement.

Branch: `feature/phase-5-social-feed`.

## Schema (migration 0011, applied to dev)

- **`follows`** (blueprint §14) — follow a profile (seller/storyteller). Public
  graph (RLS: anyone reads), follower-owned edges, `check (follower <> followed)`.
- **`feed_stories()`** RPC (§5.3) — the ranked feed. SECURITY DEFINER (aggregates
  engagement across users), returns **published, non-removed** stories only:

  ```
  score = 0.30·recency + 0.20·reactions + 0.15·comments + 0.15·saves
        + 0.10·follow-affinity        (0.10 shares — not yet tracked)
  ```
  Counts are log-normalised; `recency = 1/(1 + days_since_published)`;
  `following_only` filters to the viewer's follows.

## App

- **`/feed`** — the real feed (replaces the Phase 0 fictional preview). Tabs
  **For you** (ranked) and **Following** (requires sign-in). Feed cards (§5.4):
  photo, title/price, story preview, reaction + comment counts, "View item".
  A bottom nav (§5.1: Home / Discover / Sell / Saved / You).
- **View tracking (§5.5)** — `FeedImpression` counts a story as seen only after
  it's been ≥50% visible for ≥1s (not "page opened = view"), once per mount,
  via the existing analytics pipeline (`story_viewed`).
- **Follow (§5.6)** — follow/unfollow the storyteller from the story page (shown
  when identity is public). Drives the feed's Following tab + affinity ranking.

## Definition of Done (impl plan "Sortie Phase 5")

We can now measure:

- [x] session duration / stories-per-session (impression events)
- [x] shares (share events, §4.8)
- [x] follows (follow graph)
- [x] DAU/WAU and J1/J7 retention (analytics events + visitor/session ids)

## Verification

- `pnpm typecheck` + `pnpm build` green.
- Server-verified vs the live dev DB: `feed_stories` returns scored stories,
  `following_only` filters correctly, `/feed` renders cards (title/price), bottom
  nav present, Following tab gates for anon.
- `pnpm test:security` — **35/35** (profiles 7 + marketplace 11 + story 11 +
  follows 6): follow graph public, edges follower-owned, self-follow rejected.

## Not in scope (later / deferred)

Realtime live counters (§5.7 — Supabase Realtime, optional, later); a "Fresh" tab;
Inbox/messaging (Phase 8); Next-Chapter fund progress on cards (Phase 6);
anti-spam/brigading safeguards beyond the ranking weights (harden with Phase 7).
