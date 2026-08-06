# Formerly Yours

> **Sell the past. Fund what's next.**
> A story-commerce marketplace: sell the objects a chapter of your life left
> behind, tell their story, and fund whatever comes next.

This repository currently contains **Phase 0 — Product Validation**: a polished
landing page + fake prototype feed used to test whether people actually want to
*sell* here (not just laugh at the stories) before any real product is built.

- 📄 Product vision, data model and 12-phase plan: see the source PDFs and
  [`docs/phase-0.md`](docs/phase-0.md).
- 🚀 Ubuntu VPS (IONOS) deployment: [`docs/deployment.md`](docs/deployment.md).
- 🏷️ Brand/trademark checklist: [`docs/brand-validation.md`](docs/brand-validation.md).

## Stack (Phase 0)

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4. No backend —
validation data (waitlist + analytics events) is written as JSONL on the server,
so it runs self-contained on the VPS. The real backend (Supabase/PostgreSQL,
auth, Stripe, monorepo) begins in **Phase 1**.

## Quick start

```bash
npm install
cp .env.example .env.local     # set FY_ADMIN_KEY (and NEXT_PUBLIC_APP_URL)
npm run dev                    # http://localhost:3000
```

| Route | What |
| --- | --- |
| `/` | Landing page (two CTAs: *sell* vs *just the stories*) |
| `/feed` | Prototype feed — 24 fictional examples, swipe / react / share |
| `POST /api/waitlist` | Waitlist capture (`email`, `intent`) |
| `POST /api/events` | Validation event ingestion |
| `GET /api/stats?key=…` | Aggregated funnel (protected by `FY_ADMIN_KEY`) |

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build (standalone output)
npm run start       # run the production server
npm run typecheck   # tsc --noEmit
```

## Project layout

```
src/
  app/                landing (/), feed (/feed), api routes, robots, sitemap
  components/         Logo, ReactionBar, ExampleStoryCard, landing/*, feed/*
  lib/
    types.ts          domain types (mirrors the real schema vocabulary)
    reference.ts      reactions, contexts, story modes, money formatting
    fixtures.ts       24 fictional feed items
    analytics.ts      client event tracker -> /api/events
    server/store.ts   JSONL persistence (waitlist + events + stats)
docs/                 phase-0, deployment, brand-validation
```

## Roadmap

Phase 0 (this) → 1 Foundation → 2 Auth/Identity → 3 Marketplace → 4 Stories →
5 Feed → 6 Next Chapter → 7 Trust & Safety → 8 Messaging/Offers →
9 Stripe Connect → 10 Shipping/Disputes → 11 Growth → 12 iOS/Android (Expo).

Guiding rule from the blueprint: **`listing ≠ story ≠ next_chapter ≠ order ≠
payment ≠ moderation`**. PostgreSQL stays the source of truth; the frontend never
decides authorization.
