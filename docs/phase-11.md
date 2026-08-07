# Phase 11 — Growth Engine (SEO)

**Goal:** make the public content discoverable and shareable.

Branch: `feature/phase-11-growth-seo`.

## Delivered

### 11.1 SEO
- **Dynamic `sitemap.xml`** (ISR, hourly) — every active listing, published story,
  public chapter, top-level category, and relationship tag, plus the static
  routes.
- **`/category/[slug]`** — SEO landing per category (active listings via the
  search RPC) with canonical + OpenGraph.
- **`/tag/[slug]`** — SEO landing per relationship context (tagged published
  stories) with canonical + OpenGraph.
- **Structured data (JSON-LD)** — `Product` on `/item`, `Article` on `/story`.
- **Canonical + OpenGraph + Twitter** metadata across the public routes
  (`/item`, `/story`, `/chapter`, `/category`, `/tag`).

### 11.2 Share cards
- Server-generated **OpenGraph images** (`next/og`, 1200×630) for `/item` and
  `/story` — branded card with title, price/preview, and the tagline.

### 11.7 Performance (already in place)
Server rendering by default, `webp` image pipeline with signed URLs, feed + search
pagination, and DB indexes added throughout Phases 3–10.

## Verification

- `pnpm typecheck` + `pnpm build` green (routes: `/category/[slug]`, `/tag/[slug]`,
  `/item/[handle]/opengraph-image`, `/story/[handle]/opengraph-image`, dynamic
  `sitemap.xml`).
- Live smoke: sitemap includes category/listing/story URLs; `/category/fashion`
  renders its listings; `/tag/moving_out` renders; `/item` emits `Product` JSON-LD;
  the item share card returns `200 image/png`.

## Not in scope / deferred

- **11.3 Hall of Fame** (Story of the Week, Most Savage…) — opt-in leaderboards.
- **11.4 Referral** ("invite a friend") — deliberately after the financial system
  settles.
- **11.5 Analytics** — the app already logs events via `lib/analytics` (`track`);
  a full **PostHog** integration (acquisition/activation/marketplace funnels) is
  future.
- **11.6 Feature flags** (`feed_algorithm_v2`, `ai_story_default`, …) — a
  `feature_flags` table + a server helper; not yet built.
