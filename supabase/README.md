# Supabase — Once Was Yours

We run **Docker-less** (implementation plan §1.4): local Next.js talks to a
Supabase **cloud** project; migrations are pushed with the CLI. No local Docker
runtime required.

## Environments

Three cloud projects (implementation plan §1.3):

| Env | Purpose |
| --- | --- |
| development | test data, day-to-day dev |
| staging | QA + Stripe test mode |
| production | real users |

## One-time setup

```bash
# install the CLI (macOS/Linux). On the VPS: see docs/deployment.md
brew install supabase/tap/supabase   # or: npm i -g supabase

supabase login                       # uses SUPABASE_ACCESS_TOKEN
supabase link --project-ref <dev-project-ref>
```

Then copy the project's URL + keys into `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...        # server only, never committed
```

> Supabase is moving to the new **publishable / secret** key names (the old
> anon/service_role keys are being deprecated). We build on the new convention.

## Applying migrations

```bash
pnpm db:push        # supabase db push  -> applies supabase/migrations/*
pnpm db:diff        # generate a migration from schema changes
pnpm db:reset       # DANGER: reset the linked db to migrations + seed
```

Regenerate typed client types after schema changes:

```bash
supabase gen types typescript --linked > packages/database/src/types.ts
```

## Migration order

Migrations are applied in filename order (blueprint §45). Phase 1 ships the
foundation only:

```
0001_extensions.sql   -- pgcrypto, pg_trgm, citext, moddatetime
0002_enums.sql        -- listing/order/offer/story/... enums
```

Tables land in their phases: profiles (Phase 2), categories + listings (Phase 3),
stories (Phase 4), next_chapters (Phase 6), orders/payments (Phase 9), etc.
