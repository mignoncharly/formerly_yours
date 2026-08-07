import { ImageResponse } from "next/og";
import { createServiceSupabaseClient } from "@owy/database/server";
import { shortIdFromHandle } from "@/lib/listings";

export const alt = "A story on Once Was Yours";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// §11.2 — server-generated story share card.
export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const admin = createServiceSupabaseClient();
  const { data: s } = await admin
    .from("stories")
    .select("headline, body")
    .eq("short_id", shortIdFromHandle(handle))
    .maybeSingle();

  const headline = s?.headline ?? "A story worth telling";
  const preview = (s?.body ?? "").slice(0, 140);

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
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>
            {headline}
          </div>
          {preview ? (
            <div style={{ display: "flex", fontSize: 30, color: "#b1a6c1", marginTop: 28 }}>
              {preview}
              {(s?.body?.length ?? 0) > 140 ? "…" : ""}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#b1a6c1" }}>
          Sell the past. Fund what&rsquo;s next.
        </div>
      </div>
    ),
    size,
  );
}
