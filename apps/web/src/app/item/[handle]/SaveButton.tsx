"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { toggleSave } from "./actions";

export function SaveButton({
  listingId,
  initialSaved,
  signedIn,
  next,
}: {
  listingId: string;
  initialSaved: boolean;
  signedIn: boolean;
  next: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(initialSaved);
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    startTransition(async () => {
      const res = await toggleSave(listingId);
      if (res.ok) setSaved(res.saved);
    });
  }

  return (
    <Button type="button" variant="ghost" onClick={onClick} disabled={pending}>
      {saved ? "♥ Saved" : "♡ Save"}
    </Button>
  );
}
