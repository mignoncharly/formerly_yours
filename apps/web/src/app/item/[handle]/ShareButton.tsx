"use client";

import * as React from "react";
import { Button } from "@/components/ui";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = React.useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — nothing to do
    }
  }

  return (
    <Button type="button" variant="ghost" onClick={share}>
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
