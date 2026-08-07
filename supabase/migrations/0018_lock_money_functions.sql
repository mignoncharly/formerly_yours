-- 0018_lock_money_functions.sql
-- Phase 9 fix: the money mutation functions must be service_role ONLY, but
-- `revoke execute ... from public` in 0017 was not enough — Supabase's default
-- privileges also GRANT EXECUTE on new public functions to `anon` and
-- `authenticated`, so anonymous callers could still run create_pending_order
-- (creating orders + reserving listings). Revoke from those roles explicitly.

revoke execute on function public.create_pending_order(uuid, uuid) from anon, authenticated;
revoke execute on function public.attach_payment_session(uuid, text) from anon, authenticated;
revoke execute on function public.confirm_order_paid(text, text) from anon, authenticated;
revoke execute on function public.upsert_seller_stripe_account(uuid, text) from anon, authenticated;
revoke execute on function public.set_seller_payouts(uuid, boolean, text) from anon, authenticated;
revoke execute on function public.get_seller_account(uuid) from anon, authenticated;
