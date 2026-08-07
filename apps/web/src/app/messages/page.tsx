import type { Metadata } from "next";
import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireOnboarded("/messages");
  const supabase = await createClient();

  // RLS returns only the viewer's conversations.
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, listing_id, created_at")
    .order("created_at", { ascending: false });

  const admin = createServiceSupabaseClient();
  const ids = [...new Set((convs ?? []).map((c) => c.listing_id).filter(Boolean))] as string[];
  const { data: listings } = ids.length
    ? await admin.from("listings").select("id, title").in("id", ids)
    : { data: [] };
  const titleById = new Map((listings ?? []).map((l) => [l.id, l.title]));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-8 pb-24">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        Messages
      </h1>
      {(convs ?? []).length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">
          No conversations yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(convs ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="block">
                <Card className="p-4 hover:border-[color-mix(in_oklab,var(--color-paper)_30%,var(--color-line))]">
                  <span className="text-[var(--color-paper)]">
                    {(c.listing_id && titleById.get(c.listing_id)) || "Conversation"}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
