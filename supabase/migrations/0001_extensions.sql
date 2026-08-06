-- 0001_extensions.sql
-- Foundational PostgreSQL extensions for Once Was Yours.
-- (Phase 1 — proves the migration pipeline works before any tables exist.)

-- gen_random_uuid() for uuid primary keys.
create extension if not exists pgcrypto with schema extensions;

-- Trigram search for the Postgres-based marketplace search (implementation plan §3.6).
create extension if not exists pg_trgm with schema extensions;

-- Case-insensitive text (e.g. usernames) where useful.
create extension if not exists citext with schema extensions;

-- Auto-maintain updated_at columns via triggers in later migrations.
create extension if not exists moddatetime with schema extensions;
