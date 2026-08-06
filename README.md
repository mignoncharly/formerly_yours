# Once Was Yours

> **Sell the past. Fund what's next.**
> A story-commerce marketplace: sell the objects a chapter of your life left
> behind, tell their story, and fund whatever comes next.

Concept validated in **Phase 0** (landing + prototype feed). Now building
**Phase 1 — Technical Foundation**: a pnpm + Turborepo monorepo, Supabase
foundation, CI, design system and PWA.

- 📄 Product vision, data model & 12-phase plan: [`docs/planning/`](docs/planning) (source PDFs)
- 🧪 Phase 0 (validation): [`docs/phase-0.md`](docs/phase-0.md)
- 🧱 Phase 1 (foundation): [`docs/phase-1.md`](docs/phase-1.md)
- 🚀 Deployment (IONOS VPS → `oncewasyours.gestionatech.de`): [`docs/deployment.md`](docs/deployment.md)
- 🏷️ Brand checklist: [`docs/brand-validation.md`](docs/brand-validation.md)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
**pnpm + Turborepo** · Supabase/PostgreSQL (new publishable/secret keys) ·
Zod. Stripe Connect and Expo (mobile) arrive in later phases.

## Quick start

```bash
corepack enable                       # or: npm i -g pnpm
pnpm install
cp apps/web/.env.example apps/web/.env.local   # set OWY_ADMIN_KEY etc.
pnpm dev                              # http://localhost:3000
```

## Workspace layout

```
apps/
  web/                  Next.js PWA (landing, feed, api, robots, sitemap, offline)
packages/
  config/               shared tsconfig presets (@owy/config)
  types/                shared domain types (@owy/types)
  validation/           Zod schemas (@owy/validation)
  database/             Supabase client factories (@owy/database)
supabase/
  migrations/           0001_extensions, 0002_enums (blueprint order)
  seed/ · functions/    seed data + Edge Functions (per phase)
docs/                   phase-0, phase-1, deployment, brand-validation, planning/
.github/workflows/      CI (install → typecheck → build)
```

> `apps/admin` (back-office) and packages `ui` / `domain` / `analytics` are
> introduced in the phases that need them; for now the design system and the
> analytics client live in `apps/web`.

## Common scripts

```bash
pnpm dev            # turbo: run all dev tasks
pnpm build          # turbo: build all
pnpm typecheck      # turbo: tsc --noEmit across packages
pnpm web:dev        # just the web app
pnpm db:push        # supabase db push (see supabase/README.md)
```

## App routes (web)

| Route | What |
| --- | --- |
| `/` | Landing page (two CTAs: *sell* vs *just the stories*) |
| `/feed` | Prototype feed — 24 fictional examples, swipe / react / share |
| `/offline` | PWA offline fallback |
| `POST /api/waitlist` | Waitlist capture (Zod-validated) |
| `POST /api/events` | Validation event ingestion |
| `GET /api/stats?key=…` | Aggregated funnel (protected by `OWY_ADMIN_KEY`) |

## Roadmap

Phase 0 ✅ → **1 Foundation** → 2 Auth/Identity → 3 Marketplace → 4 Stories →
5 Feed → 6 Next Chapter → 7 Trust & Safety → 8 Messaging/Offers →
9 Stripe Connect → 10 Shipping/Disputes → 11 Growth → 12 iOS/Android (Expo).

Guiding rule from the blueprint: **`listing ≠ story ≠ next_chapter ≠ order ≠
payment ≠ moderation`**. PostgreSQL stays the source of truth; the frontend never
decides authorization; money is stored in integer minor units.
