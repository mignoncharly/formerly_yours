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
        className="owy-btn owy-btn-primary"
        onClick={() => {
          track("seller_cta_clicked", { placement: "hero" });
          // Prefill intent for the waitlist form.
          window.dispatchEvent(
            new CustomEvent("owy:set-intent", { detail: "sell" }),
          );
          scrollToWaitlist();
        }}
      >
        I have something to sell →
      </button>

      <a
        className="owy-btn owy-btn-ghost"
        href="/feed"
        onClick={() => track("viewer_cta_clicked", { placement: "hero" })}
      >
        I just want the stories
      </a>
    </div>
  );
}
