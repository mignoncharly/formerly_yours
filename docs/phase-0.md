# Phase 0 — Product Validation

> Goal (implementation plan): *don't spend three months building something people
> find funny but that nobody wants to sell on.* Prove **seller intent** and
> concept comprehension **before** building the real product.

## What we're testing

| Hypothesis | Question |
| --- | --- |
| A | Do people enjoy consuming the stories? |
| B | Will people tell a story tied to an object? |
| C | Are they actually willing to **sell here** instead of Vinted/eBay? |
| D | Is *"Sell the past. Fund what's next."* more compelling than *"Sell your ex's stuff"*? |

## What was built (this app)

A self-contained **Next.js 16 (App Router, TypeScript, Tailwind v4)** app — no
real backend, everything is fake and clearly labelled.

- **Landing page** (`/`) with the exact section order from §0.2:
  Hero → Example story → How it works → Fund My Next Chapter → Example new
  chapter → Safety philosophy → Waitlist.
  - Two **distinct CTAs**: `I have something to sell` (seller) and
    `I just want the stories` (spectator). Distinguishing them is the whole point.
- **Prototype feed** (`/feed`): 24 fictional examples, vertical swipe, react,
  open, view Next Chapter, share.
- **Waitlist** capture with intent (`sell` / `browse` / `both`).
- **Quantitative event tracking** → JSONL on the server.
- **Aggregated stats** endpoint with the seller-intent funnel.

## The events (§0.4)

Captured via `POST /api/events` (see `src/lib/analytics.ts`):

```
landing_viewed        seller_cta_clicked    viewer_cta_clicked
story_viewed          story_expanded        fake_buy_clicked
waitlist_started      waitlist_completed
```

Extra prototype signals: `feed_opened`, `feed_item_viewed`, `story_reacted`,
`story_shared`, `next_chapter_viewed`, `make_offer_clicked`.

**The essential metric:** how many visitors express a *real seller intention*?
→ `stats.funnel.sellerIntentRate` = `seller_cta_clicked / landing_viewed`.

### Reading the numbers

```bash
curl "https://<domain>/api/stats?key=$OWY_ADMIN_KEY" | jq
```

Raw data lives in `OWY_DATA_DIR` (`data/` by default):
`events.jsonl`, `waitlist.jsonl`.

## Run locally

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # set OWY_ADMIN_KEY
pnpm dev                  # http://localhost:3000
```

Production build / start:

```bash
pnpm build
pnpm --filter @owy/web start
```

Deployment to the Ubuntu VPS (IONOS): see [`deployment.md`](./deployment.md).

## Definition of Done (go / no-go to Phase 1)

Proceed to Phase 1 **only** with credible signals on all four:

- [ ] **Content interest** — people watch/expand stories (`story_expanded`, feed dwell).
- [ ] **Seller intent** — a meaningful `sellerIntentRate` + `sell`/`both` waitlist signups.
- [ ] **Immediate comprehension** — visitors understand the concept without explanation.
- [ ] **No confusion with a "revenge content" platform** — safety framing lands.

Supporting deliverables:

- [x] Landing page with both CTAs
- [x] Prototype feed (swipe / react / open / next chapter / share)
- [x] Event instrumentation + waitlist + stats funnel
- [ ] `brand-validation.md` completed (checks run + decision) — see [brand-validation.md](./brand-validation.md)
- [ ] Real traffic collected + reviewed

## Explicitly NOT in Phase 0

No real payments, no auth, no database, no monorepo, no Stripe, no moderation
pipeline. Those begin in **Phase 1 — Technical Foundation** (monorepo, Supabase,
CI, design system, PWA) once the validation signals justify it.
