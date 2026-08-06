"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@owy/database/types";

// ---------------------------------------------------------------------------
// Browser Supabase client (auth-aware, cookie-backed via @supabase/ssr).
//
// Uses the publishable key — safe to expose. All authorization is enforced by
// Row Level Security in Postgres; the client never decides authorization.
// ---------------------------------------------------------------------------

function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. See apps/web/.env.example.`,
    );
  }
  return value;
}

export function createClient() {
  return createBrowserClient<Database>(
    requirePublicEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    requirePublicEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  );
}
