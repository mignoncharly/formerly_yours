import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import type { OwySupabaseClient } from "./index";

// ---------------------------------------------------------------------------
// Server-only Supabase client using the SECRET key. This bypasses RLS and must
// NEVER be imported into client code (guarded by `server-only`). Reserve it for
// trusted server operations (webhooks, admin tasks, secure RPCs).
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See apps/web/.env.example.`);
  }
  return value;
}

export function createServiceSupabaseClient(): OwySupabaseClient {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
