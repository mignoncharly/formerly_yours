-- 0017_payments_ledger.sql
-- Phase 9 — Stripe Connect / money (implementation plan §9, schema blueprint §5, §20-24).
-- The browser NEVER confirms payment: orders/payments are created server-side and
-- confirmed only by the verified Stripe webhook. Progress on chapters and every
-- financial movement are DERIVED from an append-only ledger — never a mutable
-- counter (§9.6/§9.7). Money is integer minor units.

-- =============================================================================
-- 1. private.seller_accounts (blueprint §5) — Stripe connected account + KYC.
--    Private schema: never exposed to the client.
-- =============================================================================
create schema if not exists private;

create table private.seller_accounts (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  seller_type       text not null default 'private',
  stripe_account_id text unique,
  kyc_status        text,
  payouts_enabled   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =============================================================================
-- 2. Fee configuration (§9.5) — dynamic, not hardcoded. Basis points.
-- =============================================================================
create table public.fee_rules (
  id                   bigint generated always as identity primary key,
  is_active            boolean not null default true,
  platform_fee_bps     integer not null,   -- charged to the seller
  buyer_protection_bps integer not null,   -- charged to the buyer
  min_platform_fee     integer not null default 0,
  created_at           timestamptz not null default now()
);

insert into public.fee_rules (platform_fee_bps, buyer_protection_bps, min_platform_fee)
values (700, 300, 50); -- 7% seller fee, 3% buyer protection, min 0.50 €

alter table public.fee_rules enable row level security;
create policy "fee rules are viewable by everyone"
  on public.fee_rules for select using (is_active);

create or replace function public.compute_fees(subtotal integer)
returns table (platform_fee integer, buyer_protection integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    greatest(round(subtotal * r.platform_fee_bps / 10000.0)::int, r.min_platform_fee),
    round(subtotal * r.buyer_protection_bps / 10000.0)::int
  from public.fee_rules r
  where r.is_active
  order by r.id desc
  limit 1;
$$;

-- =============================================================================
-- 3. orders + order_items (blueprint §20-21).
-- =============================================================================
create table public.orders (
  id                uuid primary key default extensions.gen_random_uuid(),
  buyer_id          uuid not null references public.profiles (id),
  seller_id         uuid not null references public.profiles (id),
  currency          char(3) not null default 'EUR',
  subtotal_amount   integer not null,
  buyer_fee_amount  integer not null default 0,   -- buyer protection
  seller_fee_amount integer not null default 0,   -- platform fee
  shipping_amount   integer not null default 0,
  total_amount      integer not null,             -- what the buyer pays
  status            public.order_status not null default 'pending_payment',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function extensions.moddatetime (updated_at);

create index orders_buyer_idx on public.orders (buyer_id);
create index orders_seller_idx on public.orders (seller_id);

create table public.order_items (
  id           uuid primary key default extensions.gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  listing_id   uuid not null unique references public.listings (id),
  price_amount integer not null,
  created_at   timestamptz not null default now()
);

-- Orders are readable by their two parties only. All writes are server-side
-- (service role) via the checkout action + webhook — no client insert/update.
alter table public.orders enable row level security;
create policy "order parties read their orders"
  on public.orders for select
  to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

alter table public.order_items enable row level security;
create policy "order items follow order visibility"
  on public.order_items for select
  to authenticated
  using (
    exists (select 1 from public.orders o
            where o.id = order_id and (select auth.uid()) in (o.buyer_id, o.seller_id))
  );

-- =============================================================================
-- 4. private.payments / payouts / refunds (blueprint §22-24) — never exposed.
--    Payment status comes EXCLUSIVELY from the verified Stripe webhook (§9.2).
-- =============================================================================
create table private.payments (
  id                        uuid primary key default extensions.gen_random_uuid(),
  order_id                  uuid not null references public.orders (id) on delete cascade,
  provider                  text not null default 'stripe',
  provider_payment_intent_id text unique,
  provider_session_id       text unique,
  amount                    integer not null,
  currency                  char(3) not null default 'EUR',
  status                    text not null default 'pending',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table private.payouts (
  id                  uuid primary key default extensions.gen_random_uuid(),
  order_id            uuid not null references public.orders (id) on delete cascade,
  seller_id           uuid not null references public.profiles (id),
  provider_transfer_id text unique,
  gross_amount        integer not null,
  platform_fee_amount integer not null default 0,
  net_amount          integer not null,
  status              text not null default 'pending',
  created_at          timestamptz not null default now()
);

create table private.refunds (
  id                uuid primary key default extensions.gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  amount            integer not null,
  reason            text,
  provider_refund_id text unique,
  status            text not null default 'pending',
  created_at        timestamptz not null default now()
);

-- =============================================================================
-- 5. private.ledger_entries (§9.6) — immutable financial journal. Every cent is
--    explainable (§9.7). Amounts are signed integer minor units.
-- =============================================================================
create type public.ledger_entry_type as enum (
  'order',
  'payment',
  'platform_fee',
  'buyer_protection',
  'seller_receivable',
  'refund',
  'chargeback',
  'payout',
  'chapter_contribution'
);

create table private.ledger_entries (
  id         bigint generated always as identity primary key,
  order_id   uuid references public.orders (id) on delete set null,
  entry_type public.ledger_entry_type not null,
  amount     integer not null,
  currency   char(3) not null default 'EUR',
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index ledger_entries_order_idx on private.ledger_entries (order_id);

-- =============================================================================
-- 6. Money mutation functions (§9.2). SECURITY DEFINER, granted to service_role
--    ONLY — all money writes happen server-side (checkout action + webhook),
--    never from the browser. Under the service role auth.uid() is null, so the
--    caller passes the (already-authenticated) buyer id.
-- =============================================================================
create or replace function public.create_pending_order(in_listing uuid, in_buyer uuid)
returns table (order_id uuid, total integer, seller_id uuid, stripe_account text)
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  sa private.seller_accounts;
  pf integer; bp integer; total_amt integer; oid uuid;
begin
  select * into l from public.listings where id = in_listing;
  if l.id is null then raise exception 'listing not found'; end if;
  if l.status <> 'active' then raise exception 'listing not available'; end if;
  if l.seller_id = in_buyer then raise exception 'cannot buy your own listing'; end if;

  select * into sa from private.seller_accounts where user_id = l.seller_id;
  if sa.user_id is null or not sa.payouts_enabled then
    raise exception 'seller cannot receive payouts yet';
  end if;

  select platform_fee, buyer_protection into pf, bp from public.compute_fees(l.price_amount);
  total_amt := l.price_amount + bp; -- buyer pays subtotal + protection (shipping = Phase 10)

  insert into public.orders (buyer_id, seller_id, currency, subtotal_amount,
                             buyer_fee_amount, seller_fee_amount, total_amount)
  values (in_buyer, l.seller_id, l.currency, l.price_amount, bp, pf, total_amt)
  returning id into oid;

  insert into public.order_items (order_id, listing_id, price_amount) values (oid, l.id, l.price_amount);
  insert into private.payments (order_id, amount, currency, status) values (oid, total_amt, l.currency, 'pending');
  insert into private.ledger_entries (order_id, entry_type, amount, currency, metadata)
    values (oid, 'order', total_amt, l.currency, jsonb_build_object('listing_id', l.id));

  update public.listings set status = 'reserved' where id = l.id; -- reserve while paying

  order_id := oid; total := total_amt; seller_id := l.seller_id; stripe_account := sa.stripe_account_id;
  return next;
end; $$;

create or replace function public.attach_payment_session(in_order uuid, in_session text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update private.payments set provider_session_id = in_session where order_id = in_order;
end; $$;

-- Confirmed EXCLUSIVELY by the verified webhook. Idempotent.
create or replace function public.confirm_order_paid(in_session text, in_intent text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p private.payments;
  o public.orders;
  seller_net integer;
  the_listing uuid;
  ch uuid;
begin
  select * into p from private.payments where provider_session_id = in_session for update;
  if p.id is null then raise exception 'payment not found'; end if;
  if p.status = 'succeeded' then return; end if; -- idempotent

  update private.payments set status = 'succeeded', provider_payment_intent_id = in_intent, updated_at = now()
    where id = p.id;

  select * into o from public.orders where id = p.order_id for update;
  update public.orders set status = 'paid' where id = o.id;

  select listing_id into the_listing from public.order_items where order_id = o.id;
  update public.listings set status = 'sold', sold_at = now() where id = the_listing;

  seller_net := o.subtotal_amount - o.seller_fee_amount;

  insert into private.ledger_entries (order_id, entry_type, amount, currency) values
    (o.id, 'payment', o.total_amount, o.currency),
    (o.id, 'platform_fee', -o.seller_fee_amount, o.currency),
    (o.id, 'buyer_protection', o.buyer_fee_amount, o.currency),
    (o.id, 'seller_receivable', seller_net, o.currency);

  select lc.chapter_id into ch from public.listing_chapters lc where lc.listing_id = the_listing;
  if ch is not null then
    insert into private.ledger_entries (order_id, entry_type, amount, currency, metadata)
      values (o.id, 'chapter_contribution', seller_net, o.currency, jsonb_build_object('chapter_id', ch));
  end if;
end; $$;

create or replace function public.upsert_seller_stripe_account(in_user uuid, in_account text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into private.seller_accounts (user_id, stripe_account_id) values (in_user, in_account)
  on conflict (user_id) do update set stripe_account_id = excluded.stripe_account_id, updated_at = now();
end; $$;

create or replace function public.set_seller_payouts(in_user uuid, in_enabled boolean, in_kyc text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update private.seller_accounts set payouts_enabled = in_enabled, kyc_status = in_kyc, updated_at = now()
    where user_id = in_user;
end; $$;

create or replace function public.get_seller_account(in_user uuid)
returns table (stripe_account_id text, payouts_enabled boolean, kyc_status text)
language sql stable security definer set search_path = '' as $$
  select stripe_account_id, payouts_enabled, kyc_status from private.seller_accounts where user_id = in_user;
$$;

-- Server-side only: revoke the default PUBLIC execute, grant to service_role.
revoke execute on function public.create_pending_order(uuid, uuid) from public;
revoke execute on function public.attach_payment_session(uuid, text) from public;
revoke execute on function public.confirm_order_paid(text, text) from public;
revoke execute on function public.upsert_seller_stripe_account(uuid, text) from public;
revoke execute on function public.set_seller_payouts(uuid, boolean, text) from public;
revoke execute on function public.get_seller_account(uuid) from public;
grant execute on function public.create_pending_order(uuid, uuid) to service_role;
grant execute on function public.attach_payment_session(uuid, text) to service_role;
grant execute on function public.confirm_order_paid(text, text) to service_role;
grant execute on function public.upsert_seller_stripe_account(uuid, text) to service_role;
grant execute on function public.set_seller_payouts(uuid, boolean, text) to service_role;
grant execute on function public.get_seller_account(uuid) to service_role;
