import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ---------------------------------------------------------------------------
// Browser / anon Supabase client.
//
// Uses Supabase's NEW key convention (publishable + secret). The publishable
// key is safe to expose; all real authorization is enforced by Row Level
// Security in Postgres — the frontend never decides authorization.
// ---------------------------------------------------------------------------

export type OwySupabaseClient = SupabaseClient<Database>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. See apps/web/.env.example.`,
    );
  }
  return value;
}

/** Public, RLS-guarded client for use in the browser or public server code. */
export function createBrowserSupabaseClient(): OwySupabaseClient {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}

export type { Database };
