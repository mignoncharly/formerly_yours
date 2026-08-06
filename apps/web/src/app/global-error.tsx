"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#100b1a",
          color: "#f6f1ea",
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem" }}>🌧️</div>
          <h1 style={{ marginTop: "1rem" }}>Something went wrong</h1>
          <p style={{ color: "#b1a6c1" }}>
            We&apos;ve been notified. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1.25rem",
              borderRadius: "999px",
              border: "none",
              padding: "0.75rem 1.4rem",
              background: "#ff5d8f",
              color: "#2a0714",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
