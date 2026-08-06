"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Fires `landing_viewed` exactly once per page load. */
export function LandingAnalytics() {
  useEffect(() => {
    track("landing_viewed");
  }, []);
  return null;
}
