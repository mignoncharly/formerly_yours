import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { Card } from "@/components/ui";
import { formatMinorPrice } from "@/lib/listings";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireOnboarded("/orders");
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, total_amount, status, currency")
    .order("created_at", { ascending: false });

  const admin = createServiceSupabaseClient();
  const { data: items } = orders?.length
    ? await admin
        .from("order_items")
        .select("order_id, listing_id")
        .in("order_id", orders.map((o) => o.id))
    : { data: [] };
  const listingByOrder = new Map((items ?? []).map((i) => [i.order_id, i.listing_id]));
  const listingIds = [...new Set((items ?? []).map((i) => i.listing_id))];
  const { data: listings } = listingIds.length
    ? await admin.from("listings").select("id, title").in("id", listingIds)
    : { data: [] };
  const titleById = new Map((listings ?? []).map((l) => [l.id, l.title]));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10 pb-24">
      <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        Orders
      </h1>

      {sp.paid && (
        <Card className="mb-5 border-[color-mix(in_oklab,#5ce1a8_40%,var(--color-line))] p-4 text-sm text-[var(--color-paper)]">
          Payment received — thank you! It may take a moment to appear as paid.
        </Card>
      )}

      {(orders ?? []).length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted)]">No orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(orders ?? []).map((o) => {
            const lid = listingByOrder.get(o.id);
            return (
              <li key={o.id}>
                <Card className="flex items-center justify-between p-4">
                  <span className="text-[var(--color-paper)]">
                    {(lid && titleById.get(lid)) || "Order"}
                  </span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {formatMinorPrice(o.total_amount, o.currency)} ·{" "}
                    {o.seller_id === profile.id ? "sold" : "bought"} · {o.status}
                  </span>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
