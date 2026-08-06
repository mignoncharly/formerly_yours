# Once Was Yours — rules for Claude Code

Story-commerce marketplace ("Sell the past. Fund what's next."). Monorepo:
`apps/web` (Next.js 16 PWA) + `packages/*` (config, types, validation, database).
Product vision, data model and the 12-phase plan live in `docs/planning/*.pdf`;
phase notes in `docs/phase-0.md`, `docs/phase-1.md`.

## Start EVERY session with this
1. `git fetch && git pull --ff-only` on the branch you're using — **before**
   editing. (A past session skipped this, was 2 commits behind, and rebuilt files
   that already existed on `main`. Don't repeat that.)
2. **On the server** (and any shell there): `export NVM_DIR=$HOME/.nvm; . "$NVM_DIR/nvm.sh"; nvm use 22`
   then confirm `node -v` is v22.x.

## Environments
- **Prod/staging server**: IONOS VPS `217.154.166.155`, repo at
  `~/apps/oncewasyours`, domain `oncewasyours.gestionatech.de`. It's a **shared
  box** with other live apps. System Node is **18 — do NOT change it**; this app
  uses an **isolated nvm Node 22**. Deploy = standalone build + systemd + nginx;
  `./scripts/deploy.sh` (see `docs/deployment.md`). The server runs `main`.
- **Windows dev machine**: run `pnpm` from **PowerShell** (the git-bash pnpm shim
  is broken there); use Bash only for file ops/git.

## Secrets — never print, never commit
- Real keys live ONLY in git-ignored files: `apps/web/.env.local`,
  `docs/supabase_access.md`, `docs/sentry_keys.md`. Read them with tooling; never
  echo their values into chat or commits. The user rotates all keys at project end.
- **Secret-guard before every commit:**
  ```
  git add -A && git diff --cached | grep -nE "sb_secret_|sb_publishable_|sntrys_|OnceWasYours@|eyJhbGciOi|ingest.*sentry.io/[0-9]" || echo clean
  ```
  Abort if it matches.

## Database / Supabase (Docker-less)
- Dev project is connected. To change schema: add `supabase/migrations/NNNN_name.sql`
  then `pnpm db:migrate` (`scripts/db-migrate.mjs` — direct connection, records
  versions in `supabase_migrations.schema_migrations`, CLI-compatible).
- Keep `packages/database/src/types.ts` in sync **by hand** (no Supabase access
  token to run `supabase gen types`).

## Architecture invariants (from the blueprint)
- `listing ≠ story ≠ next_chapter ≠ order ≠ payment ≠ moderation`.
- PostgreSQL is the source of truth. **The frontend NEVER decides authorization** —
  RLS on every exposed table; sensitive ops via secure SQL functions / Edge Functions.
- Money is stored in **integer minor units** (69000 = 690,00 €).
- Trust & safety: **"Tell your story. Never expose theirs."** No PII / third-party
  exposure in stories or images.

## Git / workflow
- **`main` stays deployable** (the server builds from it). Do phase work on
  `feature/*` branches; merge only when the increment is tested. Small commits.
- Verify `pnpm typecheck` and `pnpm build` before committing.
- End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## Status
Phase 0 ✅ · Phase 1 ✅ (+ Supabase & Sentry connected) · Phase 2 (Auth + Identity
+ Security) in progress. Deploy is built on the server; going live needs the
DNS record + sudo steps in `docs/deployment.md`.
