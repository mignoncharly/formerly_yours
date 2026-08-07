"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toggleBlock } from "@/app/report/actions";

export function BlockButton({
  blockedId,
  initialBlocked,
  signedIn,
  next,
}: {
  blockedId: string;
  initialBlocked: boolean;
  signedIn: boolean;
  next: string;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = React.useState(initialBlocked);
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    startTransition(async () => {
      const res = await toggleBlock(blockedId);
      if (res.ok) setBlocked(res.blocked);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-paper)]"
    >
      {blocked ? "Unblock" : "Block"}
    </button>
  );
}
