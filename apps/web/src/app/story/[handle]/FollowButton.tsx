"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { toggleFollow } from "./follow-actions";

export function FollowButton({
  followedId,
  initialFollowing,
  signedIn,
  next,
}: {
  followedId: string;
  initialFollowing: boolean;
  signedIn: boolean;
  next: string;
}) {
  const router = useRouter();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    startTransition(async () => {
      const res = await toggleFollow(followedId);
      if (res.ok) setFollowing(res.following);
    });
  }

  return (
    <Button
      type="button"
      variant={following ? "ghost" : "primary"}
      onClick={onClick}
      disabled={pending}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
