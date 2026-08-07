import { ImageResponse } from "next/og";
import { createServiceSupabaseClient } from "@owy/database/server";
import { shortIdFromHandle, formatMinorPrice } from "@/lib/listings";

export const alt = "Once Was Yours listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// §11.2 — server-generated share card.
export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const admin = createServiceSupabaseClient();
  const { data: l } = await admin
    .from("listings")
    .select("title, price_amount, currency")
    .eq("short_id", shortIdFromHandle(handle))
    .maybeSingle();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#100b1a",
          color: "#f6f1ea",
          padding: "72px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 3, color: "#e9c46a" }}>
          ONCE WAS YOURS
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>
            {l?.title ?? "An object with a story"}
          </div>
          <div style={{ display: "flex", fontSize: 52, color: "#ff5d8f", marginTop: 28 }}>
            {formatMinorPrice(l?.price_amount ?? null, l?.currency ?? "EUR")}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#b1a6c1" }}>
          Sell the past. Fund what&rsquo;s next.
        </div>
      </div>
    ),
    size,
  );
}
