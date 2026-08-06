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
| migrations fonctionnelles | ✅ code/pipeline · 🟡 apply needs a linked project |
| Supabase connecté | 🟡 client code ready · needs cloud project + keys |
| staging | 🟡 needs Supabase staging + first VPS deploy |
| monitoring technique initial | 🟡 Sentry env placeholder; SDK deferred |

Verified locally: `pnpm build` ✅ and `pnpm typecheck` (all packages) ✅.

## What needs you (to fully close Phase 1)

1. **Create Supabase projects** (dev first; staging/prod later). Paste
   `NEXT_PUBLIC_SUPABASE_URL`, `..._PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` into
   `apps/web/.env.local`.
2. **Link + push migrations:** `supabase link --project-ref <ref>` then
   `pnpm db:push`; regenerate types into `packages/database/src/types.ts`.
3. **Deploy to the VPS** at `oncewasyours.gestionatech.de` — follow
   [`docs/deployment.md`](deployment.md) (DNS A record + systemd + nginx + certbot).
4. **GitHub secrets** for CI/CD as needed (none required for the current build job).
5. **Sentry** (optional now): create a project, add the DSN, then we wire
   `@sentry/nextjs`.

## Next: Phase 2 — Auth + Identity + Security

Supabase Auth (magic link / OTP, Google, Apple), the `profiles` table + bootstrap
trigger, onboarding, profile privacy, and **RLS on every exposed table** with a
dedicated security test suite — before any marketplace objects exist.
