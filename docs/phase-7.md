# Phase 7 — Trust & Safety

**Goal:** the safety foundation that must exist **before real money** — report,
block, moderation, suspension, a basic process, and an audit trail.

Branch: `feature/phase-7-trust-safety`.

## Schema (migrations 0013–0014, applied to dev)

- **`report_reason`** + **`staff_role`** enums; **`profiles.role`** (support /
  moderator / admin / super_admin — §7.5, not a bare `is_admin`).
- **Privilege-escalation guard** — a user must never escalate their own role or
  lift their own suspension. RLS lets a user edit their own profile row, so
  `0014` revokes the table-level UPDATE on `profiles` from `authenticated` and
  re-grants UPDATE on **only** the user-editable columns. (`0013`'s column-level
  REVOKE was ineffective on its own — a table grant covers every column.)
- **`blocked_users`** (§28), **`reports`** (§29 — typed FKs + exactly-one-target
  CHECK), both with RLS.
- **`private.moderation_cases`** (§30) + **`audit.events`** (§31) in
  **non-exposed schemas** (unreachable via PostgREST).
- **`is_staff()`** role gate + SECURITY DEFINER staff actions
  **`moderate_content`**, **`suspend_user`**, **`resolve_report`** — each
  re-checks `is_staff()` server-side and writes the audit log (§7.4/§7.6).

## App

- **Report** — a `ReportButton` (10 reasons + details) on the story and listing
  pages → `reports`.
- **Block** — block/unblock a storyteller from the story page; blocked authors'
  stories are filtered from the feed and their comments hidden.
- **PII gate (§7.2)** — `detectPII()` blocks obvious email/phone/link at story
  publish and comment time ("Never expose theirs").
- **`/moderation`** — staff-only queue (gated by `profile.role` + RLS): open
  reports with Remove content / Suspend user / Resolve / Dismiss, all through the
  audited secure functions.

## Definition of Done (impl plan "Sortie Phase 7")

- [x] report · [x] block · [x] moderation · [x] suspension · [x] basic
  appeal/process (resolve/dismiss) · [x] audit

## Verification

- `pnpm typecheck` + `pnpm build` green.
- `pnpm test:security` — **56/56** (profiles 7 + marketplace 11 + story 11 +
  follows 6 + chapters 10 + **trust 11**): a user cannot escalate their own role
  or self-unsuspend (column privileges), reports are own/staff-only, blocks are
  own-only with no spoofing/self-block, moderation functions reject non-staff and
  work for staff (role set only by privileged code).

## Not in scope (deferred)

Image moderation (§7.3 — needs a vision model/service); automated risk-scoring
pipeline populating `moderation_cases` (§7.4); a dedicated `apps/admin` app (§7.5
— MVP uses in-app `/moderation`); richer appeals workflow.
