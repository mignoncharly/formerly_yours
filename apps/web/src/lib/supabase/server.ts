import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@owy/database/types";

// ---------------------------------------------------------------------------
// Server Supabase client (auth-aware) for React Server Components, Route
// Handlers and Server Actions. Reads/writes the session from request cookies.
//
// Still the RLS-guarded publishable key — this is the *authenticated user's*
// client, NOT the service client. For trusted, RLS-bypassing server work use
// createServiceSupabaseClient() from "@owy/database/server".
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. See apps/web/.env.example.`,
    );
  }
  return value;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component. This is safe to
            // ignore when middleware is refreshing the session (it is, below),
            // because the browser cookies are updated there.
          }
        },
      },
    },
  );
}
