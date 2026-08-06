import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 "proxy" (formerly middleware). Refreshes the Supabase session cookie
// on every matched request and enforces coarse route gating.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all request paths except:
     * - _next/static (build assets)
     * - _next/image (image optimizer)
     * - static asset files (icons, manifest, images, sw, etc.)
     * This still runs on document requests so the session cookie stays fresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
