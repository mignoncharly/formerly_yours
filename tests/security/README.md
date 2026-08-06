# Security tests (RLS)

Phase 2 DoD (§2.5/§2.6): assert the **database's** authorization, not the UI.

These run against the live dev Supabase project over the REST + Auth APIs.
They create ephemeral users via the admin API and delete them in teardown.

## Run

```
pnpm test:security
```

Requires `apps/web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. If those are
absent (e.g. CI without secrets) the suite **skips** instead of failing.

The target host is printed at the start of the run — it must be the **dev**
project, never prod.

## Covered (`profiles.rls.test.mjs`)

- bootstrap trigger creates a profile per new auth user;
- anonymous can read public profiles but cannot insert/update;
- a user can update only their own row; user A cannot edit user B;
- with-check blocks inserting a row owned by someone else.

Extend with a file per table as new RLS-guarded tables land (listings,
conversations, payments, …).
