import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@owy/database/types";

// ---------------------------------------------------------------------------
// Session refresh + route gating for Next middleware (§2.1, §2.5).
//
// Runs on every matched request: refreshes the auth token (so Server
// Components always see a valid session) and enforces coarse access rules.
// Fine-grained authorization is always enforced by RLS in Postgres — this is
// only UX-level routing.
// ---------------------------------------------------------------------------

// Routes that require an authenticated user.
const PROTECTED_PREFIXES = [
  "/account",
  "/sell",
  "/saved",
  "/chapters",
  "/moderation",
  "/messages",
  "/offers",
  "/orders",
  "/onboarding",
  "/notifications",
];

// Auth entry points — a signed-in user should not see these.
const AUTH_ROUTES = ["/sign-in"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. See apps/web/.env.example.`,
    );
  }
  return value;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between createServerClient and getUser().
  // getUser() revalidates the token with the Auth server and refreshes cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Unauthenticated user hitting a protected route → send to sign-in, keeping
  // the intended destination so we can bounce back after login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in user on an auth route → send them into the app.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // NOTE (Phase 2, step 3): once the /onboarding wizard exists, redirect
  // authenticated-but-not-onboarded users (profiles.onboarded_at is null) into
  // it here, before granting access to the rest of the app.

  return response;
}
