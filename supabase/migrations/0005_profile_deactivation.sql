-- 0005_profile_deactivation.sql
-- Phase 2 — account deactivation ("Sortie Phase 2": désactiver son compte).
-- Self-service deactivation is distinct from moderation (is_suspended): the user
-- can set/clear this themselves; a deactivated profile is hidden app-side and
-- can be reactivated on next sign-in.

alter table public.profiles
  add column deactivated_at timestamptz;
