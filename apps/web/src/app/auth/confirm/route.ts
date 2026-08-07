import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Email magic-link / OTP confirmation (§2.1). Supabase appends `token_hash`
// and `type` to the redirect link; we verify it and establish the session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get("next"));

  // Behind nginx, request.nextUrl.origin can resolve to the internal
  // localhost:3000 upstream, so redirect off the configured public URL instead.
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? origin).replace(/\/$/, "");

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(
    `${base}/sign-in?error=${encodeURIComponent("This link is invalid or has expired. Please request a new one.")}`,
  );
}

function sanitizeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}
