"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { toggleHallOfFame } from "./hall-of-fame-actions";

// Author-only control (§11.3): opt this story into the public Hall of Fame.
export function HallOfFameToggle({
  storyId,
  initialOptedIn,
}: {
  storyId: string;
  initialOptedIn: boolean;
}) {
  const [optedIn, setOptedIn] = React.useState(initialOptedIn);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await toggleHallOfFame(storyId);
      if (res.ok) setOptedIn(res.optedIn);
      else setError(res.error);
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-[var(--color-line)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--color-paper)]">Hall of Fame</p>
          <p className="text-sm text-[var(--color-muted)]">
            {optedIn
              ? "This story can appear in the public Hall of Fame."
              : "Let this story compete in the public Hall of Fame."}
          </p>
        </div>
        <Button
          type="button"
          variant={optedIn ? "ghost" : "primary"}
          onClick={onClick}
          disabled={pending}
        >
          {optedIn ? "Remove" : "Add"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-[var(--color-primary)]">{error}</p> : null}
    </div>
  );
}
