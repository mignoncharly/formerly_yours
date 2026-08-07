-- 0023_notifications.sql
-- Retention #1 — in-app notifications. Events that used to be silent (offers,
-- messages, sales, reactions, comments, follows) now create a notification for
-- the right recipient. Notifications are SYSTEM-generated via AFTER triggers
-- (SECURITY DEFINER, so they bypass RLS) — clients can never forge one; they can
-- only read their own and mark them read.

create type public.notification_type as enum (
  'offer_received',
  'offer_accepted',
  'offer_declined',
  'message_received',
  'sale',
  'story_reaction',
  'story_comment',
  'new_follower'
);

create table public.notifications (
  id           uuid primary key default extensions.gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  type         public.notification_type not null,
  entity_type  text,
  entity_id    uuid,
  link         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

-- Read-only to the recipient; no client insert/update/delete (triggers + the
-- mark-read function below own all writes).
create policy "recipients read their own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = recipient_id);

-- Mark some (or all) of the caller's unread notifications read. Scoped to
-- auth.uid(), so a caller can only ever touch their own rows.
create or replace function public.mark_notifications_read(ids uuid[] default null)
returns integer
language sql
security definer
set search_path = ''
as $$
  with upd as (
    update public.notifications
    set read_at = now()
    where recipient_id = (select auth.uid())
      and read_at is null
      and (ids is null or id = any (ids))
    returning 1
  )
  select count(*)::int from upd;
$$;

comment on function public.mark_notifications_read is
  'Mark the caller''s unread notifications read (all, or the given ids).';

-- ===========================================================================
-- Event triggers. Each is SECURITY DEFINER so the insert bypasses RLS.
-- ===========================================================================

-- New message → notify every other conversation member.
create or replace function public.notify_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, link)
  select cm.user_id, new.sender_id, 'message_received', 'conversation', new.conversation_id,
         '/messages/' || new.conversation_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id;
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_on_message();

-- New offer → notify the counterparty (whoever did NOT propose it).
create or replace function public.notify_on_offer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, link)
  values (
    case when new.proposed_by = new.buyer_id then new.seller_id else new.buyer_id end,
    new.proposed_by, 'offer_received', 'offer', new.id, '/offers');
  return new;
end;
$$;
create trigger offers_notify after insert on public.offers
  for each row execute function public.notify_on_offer();

-- Offer accepted/declined → notify the party who didn't act.
create or replace function public.notify_on_offer_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('accepted', 'declined') and old.status is distinct from new.status then
    insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, link)
    values (
      case when (select auth.uid()) = new.seller_id then new.buyer_id else new.seller_id end,
      (select auth.uid()),
      ('offer_' || new.status)::public.notification_type,
      'offer', new.id, '/offers');
  end if;
  return new;
end;
$$;
create trigger offers_status_notify after update on public.offers
  for each row execute function public.notify_on_offer_status();

-- New comment → notify the story author (unless commenting on their own).
create or replace function public.notify_on_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, link)
  select s.author_id, new.author_id, 'story_comment', 'story', s.id, '/story/' || s.short_id
  from public.stories s
  where s.id = new.story_id and s.author_id <> new.author_id;
  return new;
end;
$$;
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_on_comment();

-- New reaction → notify the story author (unless reacting to their own).
create or replace function public.notify_on_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, link)
  select s.author_id, new.user_id, 'story_reaction', 'story', s.id, '/story/' || s.short_id
  from public.stories s
  where s.id = new.story_id and s.author_id <> new.user_id;
  return new;
end;
$$;
create trigger reactions_notify after insert on public.story_reactions
  for each row execute function public.notify_on_reaction();

-- New follower → notify the followed profile.
create or replace function public.notify_on_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, link)
  values (new.followed_id, new.follower_id, 'new_follower', 'profile', new.follower_id, '/feed');
  return new;
end;
$$;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_follow();

-- Order becomes paid → notify the seller (a sale!).
create or replace function public.notify_on_order_paid() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'paid' and old.status is distinct from new.status then
    insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, link)
    values (new.seller_id, new.buyer_id, 'sale', 'order', new.id, '/orders/' || new.id);
  end if;
  return new;
end;
$$;
create trigger orders_paid_notify after update on public.orders
  for each row execute function public.notify_on_order_paid();
