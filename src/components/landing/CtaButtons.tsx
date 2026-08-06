"use client";

import { track } from "@/lib/analytics";

function scrollToWaitlist() {
  document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
}

/**
 * The two intentionally distinct calls to action (implementation plan §0.2):
 *   primary   -> sellers   ("I have something to sell")
 *   secondary -> spectators ("I just want the stories")
 * Distinguishing them is the whole point of Phase 0.
 */
export function CtaButtons({ layout = "row" }: { layout?: "row" | "stack" }) {
  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-3 sm:flex-row"
          : "flex flex-col gap-3 sm:flex-row sm:flex-wrap"
      }
    >
      <button
        className="fy-btn fy-btn-primary"
        onClick={() => {
          track("seller_cta_clicked", { placement: "hero" });
          // Prefill intent for the waitlist form.
          window.dispatchEvent(
            new CustomEvent("fy:set-intent", { detail: "sell" }),
          );
          scrollToWaitlist();
        }}
      >
        I have something to sell →
      </button>

      <a
        className="fy-btn fy-btn-ghost"
        href="/feed"
        onClick={() => track("viewer_cta_clicked", { placement: "hero" })}
      >
        I just want the stories
      </a>
    </div>
  );
}
