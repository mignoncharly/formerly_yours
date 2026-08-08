# Phase 1 — Technical Foundation

> "Here the application really begins." Set up the repo, environments, CI,
> Supabase, design system and PWA **before** building marketplace features.

## What was built

### Monorepo (§1.1–1.2) — pnpm + Turborepo

```
apps/web                 Next.js 16 PWA (the Phase 0 app, migrated in + rebranded)
packages/config          shared tsconfig presets (@owy/config)
packages/types           domain types (@owy/types)
packages/validation      Zod schemas (@owy/validation)   ← used by /api/waitlist
packages/database        Supabase client factories (@owy/database, new keys)
supabase/                config + migrations + seed + functions
```

`apps/admin` and the `ui` / `domain` / `analytics` packages are deferred to the
phases that need them (plan §12.2 explicitly allows this).

### Environments & secrets (§1.3, §1.5)

- `apps/web/.env.example` documents public vs server-only vars, on the **new
  Supabase publishable/secret** key convention.
- Secrets never prefixed `NEXT_PUBLIC`; server secret access guarded by
  `server-only` (`@owy/database/server`). `.gitignore` blocks all `.env*.local`.
- Three cloud environments planned: development / staging / production.

### Supabase foundation (§1.4) — Docker-less

- `supabase/config.toml` + migration pipeline. Runs **without Docker**: link a
  cloud project and `pnpm db:push`. See [`supabase/README.md`](../supabase/README.md).
- Migrations `0001_extensions.sql` (pgcrypto, pg_trgm, citext, moddatetime) and
  `0002_enums.sql` (all blueprint enums). Tables land in their phases.

### CI (§1.6)

- `.github/workflows/ci.yml`: install → typecheck → build (pnpm + Turbo) on
  every push/PR to `main`.

### Branching (§1.7)

- `main` (always deployable) + `feature/*` + `fix/*`.

### Design system (§1.8) & responsive (§1.9)

- Tokens in `apps/web/src/app/globals.css` (`@theme`: colours, fonts Inter +
  Fraunces, radius, the `.owy-*` component classes).
- Typed primitives in `apps/web/src/components/ui`: `Button`, `Badge`, `Card`,
  `Progress`. Mobile-first (375/390 → 768/1024/1440+).

### PWA (§1.10)

- `manifest.webmanifest`, `display: standalone`, theme colour, SVG icon +
  `appleWebApp`, a service worker (`public/sw.js`, network-first + offline
  fallback) registered in production, and an `/offline` route. Installable.

## Definition of Done (Sortie Phase 1)

| Item | Status |
| --- | --- |
| repo propre (clean monorepo) | ✅ |
| CI fonctionnelle | ✅ (runs on push; green locally) |
| design system initial | ✅ |
| PWA installable | ✅ |
| aucun secret exposé | ✅ (env split + `server-only` + gitignore) |
| migrations fonctionnelles | ✅ applied to cloud DB (`0001`, `0002`) via `pnpm db:migrate` |
| Supabase connecté | ✅ dev project wired + DB reachable/verified |
| monitoring technique initial | ✅ `@sentry/nextjs` wired (runtime) · 🟡 awaiting DSN to emit |
| staging | 🟡 needs the first VPS deploy |

Verified: `pnpm build` ✅ (Sentry + Turbopack) and `pnpm typecheck` (all packages) ✅.

### Supabase & Sentry setup notes

- **Secrets** live only in git-ignored files (`docs/supabase_access.md`,
  `docs/sentry_keys.md`, `apps/web/.env.local`). Read by tooling, never printed
  or committed. Rotate at project end by replacing those files.
- **Migrations** applied Docker-less by `scripts/db-migrate.mjs`
  (`pnpm db:migrate`) over a direct Postgres connection, recording versions in
  `supabase_migrations.schema_migrations` so the Supabase CLI stays consistent.
  Applied: extensions (pgcrypto, pg_trgm, citext, moddatetime) + all 10 enums.
- **Sentry**: `instrumentation.ts` (+ server/edge configs),
  `instrumentation-client.ts`, `global-error.tsx`, `withSentryConfig`. Runtime
  capture activates once `NEXT_PUBLIC_SENTRY_DSN` is set; source-map upload is
  intentionally off for now (avoids `@sentry/cli` under Turbopack), with
  `SENTRY_AUTH_TOKEN`/`ORG`/`PROJECT` already in env to switch on later.

## What needs you (to fully close Phase 1)

1. **Sentry DSN** — the only missing piece for live error reporting. The org
   token you gave is scoped for releases (can't read the DSN via API). Add a line
   `dsn=https://…@…ingest.…sentry.io/…` to `docs/sentry_keys.md` (git-ignored) and
   I'll wire it in; or paste it and I'll store it. Find it in Sentry →
   Settings → Projects → oncewasyours → Client Keys (DSN).
2. **Deploy to the VPS** at `oncewasyours.com` — follow
   [`docs/deployment.md`](deployment.md) (DNS A record + systemd + nginx + certbot).
   This turns "staging" green.
3. Later: separate Supabase **staging/production** projects (the current one is
   development); GitHub secrets if CI needs them.

## Next: Phase 2 — Auth + Identity + Security

Supabase Auth (magic link / OTP, Google, Apple), the `profiles` table + bootstrap
trigger, onboarding, profile privacy, and **RLS on every exposed table** with a
dedicated security test suite — before any marketplace objects exist.
