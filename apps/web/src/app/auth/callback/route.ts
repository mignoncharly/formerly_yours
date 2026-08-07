import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google / Apple) PKCE callback — exchanges the `code` for a session,
// then redirects into the app (or back to the `next` destination).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));

  // Behind nginx, request.nextUrl.origin can resolve to the internal
  // localhost:3000 upstream, so redirect off the configured public URL instead.
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? origin).replace(/\/$/, "");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(
    `${base}/sign-in?error=${encodeURIComponent("Could not sign you in. Please try again.")}`,
  );
}

// Only allow internal, path-relative redirects (prevent open-redirect abuse).
function sanitizeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}
