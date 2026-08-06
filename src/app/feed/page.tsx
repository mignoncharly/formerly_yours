import type { Metadata } from "next";
import { FeedClient } from "@/components/feed/FeedClient";
import { FEED } from "@/lib/fixtures";

export const metadata: Metadata = {
  title: "The feed",
  description:
    "A preview of Formerly Yours — objects, their stories, and the new chapters they fund. Fictional examples during Phase 0.",
};

export default function FeedPage() {
  return <FeedClient items={FEED} />;
}
