"use client";

import * as React from "react";
import { track } from "@/lib/analytics";

// §5.5 — a real impression, not "page opened = view". We only count a story as
// seen once it's been ≥50% visible for ≥1s, and only once per mount.
export function FeedImpression({
  storyId,
  children,
}: {
  storyId: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const fired = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            if (!timer && !fired.current) {
              timer = setTimeout(() => {
                if (!fired.current) {
                  fired.current = true;
                  track("story_viewed", { storyId, surface: "feed" });
                }
                observer.disconnect();
              }, 1000);
            }
          } else if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [storyId]);

  return <div ref={ref}>{children}</div>;
}
