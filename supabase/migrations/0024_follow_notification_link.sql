-- 0024_follow_notification_link.sql
-- Now that public profile pages exist (/u/[username]), point "new follower"
-- notifications at the follower's profile instead of the generic feed.

create or replace function public.notify_on_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id, link)
  select new.followed_id, new.follower_id, 'new_follower', 'profile', new.follower_id,
         coalesce('/u/' || p.username, '/feed')
  from public.profiles p
  where p.id = new.follower_id;
  return new;
end;
$$;
