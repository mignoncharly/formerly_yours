-- 0025_notification_preferences.sql
-- Retention #2 — per-user email preferences + a delivery-dedup ledger.
--
-- Two concerns:
--   1. notification_preferences — a PRIVATE (owner-only RLS) table of email
--      opt-outs. In-app notifications are always created (triggers in 0023);
--      these switches only gate TRANSACTIONAL EMAIL. Absent row => all defaults
--      => email allowed (opt-out model), so existing users need no backfill.
--   2. email_deliveries — an idempotency ledger so a given (recipient, dedup_key)
--      email is only ever sent once, even if a server action runs twice.
--
-- Preferences are intentionally NOT on public.profiles (that table is
-- world-readable); a user's notification settings are nobody else's business.

create table public.notification_preferences (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  email_enabled  boolean not null default true,   -- master switch
  email_offers   boolean not null default true,   -- offer received / accepted / declined
  email_sales    boolean not null default true,   -- an item sold
  email_messages boolean not null default false,  -- new chat message (off by default: high volume)
  updated_at     timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Per-user transactional-email opt-outs. Owner-only. Absent row = all enabled.';

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function extensions.moddatetime (updated_at);

alter table public.notification_preferences enable row level security;

-- Owner-only: a user reads and writes exactly their own row, nobody else's.
create policy "own notification prefs are selectable"
  on public.notification_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "own notification prefs are insertable"
  on public.notification_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own notification prefs are updatable"
  on public.notification_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The frontend must never widen the master/category switches to another user;
-- user_id is fixed by the WITH CHECK above. updated_at is trigger-owned.
revoke update on public.notification_preferences from authenticated, anon;
grant update (email_enabled, email_offers, email_sales, email_messages)
  on public.notification_preferences to authenticated;

-- ---------------------------------------------------------------------------
-- Email idempotency ledger. Writes happen only via the service role (server
-- email adapter); no client grants. A unique (recipient_id, dedup_key) means a
-- second attempt to send "offer 123 accepted" to the same user is a no-op.
-- ---------------------------------------------------------------------------
create table public.email_deliveries (
  id           uuid primary key default extensions.gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete set null,
  to_address   text not null,
  dedup_key    text not null,
  subject      text,
  provider     text,
  status       text not null default 'sent',   -- 'sent' | 'failed'
  error        text,
  created_at   timestamptz not null default now()
);

create unique index email_deliveries_dedup_idx
  on public.email_deliveries (recipient_id, dedup_key);

comment on table public.email_deliveries is
  'Idempotency + audit ledger for transactional email. Service-role only.';

alter table public.email_deliveries enable row level security;
-- No policies => authenticated/anon get nothing. Service role bypasses RLS.
