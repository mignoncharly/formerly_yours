-- 0026_stripe_events.sql
-- Payment reliability — a webhook idempotency + audit ledger. The handler is
-- already idempotent at the RPC level (confirm_order_paid is a no-op once paid),
-- but Stripe can redeliver events and future handlers may not be idempotent.
-- This records every processed event id so a redelivery is a fast no-op, and
-- gives an audit trail of what the platform received.
--
-- Service-role only: writes happen exclusively from the webhook route (service
-- client). No client grants; RLS with no policies denies authenticated/anon.

create table public.stripe_events (
  id           text primary key,          -- Stripe event id (evt_...)
  type         text not null,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_events is
  'Idempotency + audit ledger for Stripe webhook events. Service-role only.';

alter table public.stripe_events enable row level security;
-- No policies => authenticated/anon get nothing. Service role bypasses RLS.
