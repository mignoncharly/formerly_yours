# Phase 3 — Marketplace Core

**Goal:** a working marketplace — create, photograph, draft, publish, browse,
search, filter and save listings — **without any storytelling yet** (stories are
Phase 4). `listing ≠ story`: nothing emotional lives on a listing.

Branch: `feature/phase-3-marketplace-core`.

## Schema (migrations 0006–0008, applied to dev)

- **`categories`** — seeded taxonomy (10 top-level + 28 subcategories). Read-only
  to clients (RLS: anyone reads `is_active`).
- **`listings`** — the product. Money in **integer minor units**. Draft-first:
  `title`/`category_id`/`condition`/`price_amount` are nullable so a draft can be
  saved step by step; `listings_publishable_chk` enforces completeness for any
  non-`draft` status. `short_id` (unique, DB-generated) powers the SEO route.
  Full-text `search_tsv` (GIN) + trigram title index.
- **`listing_images`** — bucket path only (never a public URL), `moderation_status`
  defaults `pending`. Photos live in the **private** `listing-images` bucket.
- **`saved_listings`** — a buyer's ♡ (PK `user_id,listing_id`).
- **`search_listings()`** RPC — SECURITY INVOKER (RLS applies → active-only),
  full-text + category/condition/price/country filters, ranked.

RLS on every table: active listings are public; a seller fully controls their own
rows (drafts included); images follow listing visibility; users only touch their
own saves. All enums were already defined in `0002`.

## App

- **`/sell`** — dashboard: resume drafts + your live listings + "New listing".
- **`/sell/[id]`** — 6-step wizard (photos → title → category → condition →
  details → price) with per-step autosave (server actions). Publish enforces
  completeness + ≥1 photo, flips to `active`, redirects to the listing.
- **Image pipeline (§3.4):** client `<canvas>` re-encode to webp **strips EXIF
  incl. GPS/device metadata**, uploads straight to the private bucket, records a
  `listing_images` row.
- **`/item/[slug]-[shortId]`** — signed-URL gallery, price, condition, seller,
  description, ♡ Save, Share. Story/Next-Chapter placeholder for Phase 4/6.
- **`/browse`** — Postgres search over title/brand/model/description + filters
  (category, condition, price, country) + pagination. Plain GET form (works
  without JS).
- **`/saved`** — the user's saved listings.

## Definition of Done (impl plan "Sortie Phase 3")

- [x] user creates a listing
- [x] uploads photos (compressed, EXIF/GPS stripped)
- [x] saves a draft
- [x] publishes
- [x] searches
- [x] filters
- [x] saves a listing
- [x] the marketplace works without storytelling

## Verification

- `pnpm typecheck` + `pnpm build` green.
- Server-verified against the live dev DB: `search_listings` full-text + filters,
  RLS (anon sees active only), `/item` renders 200, publish gating, 404 on unknown
  handle, `/sell` + `/saved` gated to sign-in.
- `pnpm test:security` — **18/18** (profiles 7 + marketplace 11): anon/other-user
  cannot create/edit/delete listings, drafts are private, only active is public,
  images and saves are owner-scoped.

## Not in scope (later phases)

Human moderation queue (Phase 7) — publish currently goes straight to `active`;
stories & Next Chapter (Phase 4/6); offers/checkout (Phase 8/9); seller profile
pages; server-side re-verification of stripped EXIF.
