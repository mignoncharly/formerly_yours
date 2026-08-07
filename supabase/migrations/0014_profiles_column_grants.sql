-- 0014_profiles_column_grants.sql
-- Phase 7 fix: the column-level `revoke update (role, is_suspended)` in 0013 was
-- INEFFECTIVE — `authenticated` holds a table-level UPDATE grant on profiles,
-- which covers every column, and a column REVOKE does not subtract from it. A
-- user could therefore still escalate their own role / lift their own
-- suspension. The correct restriction is: revoke the table-level UPDATE and
-- grant UPDATE only on the user-editable columns. (role, is_suspended,
-- is_verified, id, created_at are excluded; updated_at is set by the trigger.)

revoke update on public.profiles from authenticated, anon;

grant update (
  username,
  display_name,
  avatar_path,
  bio,
  country_code,
  city,
  onboarded_at,
  signup_intent,
  deactivated_at
) on public.profiles to authenticated;
