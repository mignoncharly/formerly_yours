import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@owy/database/server";
import { Card } from "@/components/ui";
import { formatMinorPrice } from "@/lib/listings";
import { OrderActions } from "./OrderActions";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireOnboarded("/orders");
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: shipment }, { data: dispute }] = await Promise.all([
    supabase.from("shipments").select("status, tracking_number, provider").eq("order_id", id).maybeSingle(),
    supabase.from("disputes").select("reason, status, created_at").eq("order_id", id).maybeSingle(),
  ]);

  const admin = createServiceSupabaseClient();
  const { data: item } = await admin.from("order_items").select("listing_id").eq("order_id", id).maybeSingle();
  const { data: listing } = item
    ? await admin.from("listings").select("title").eq("id", item.listing_id).maybeSingle()
    : { data: null };

  const isSeller = order.seller_id === profile.id;
  const isBuyer = order.buyer_id === profile.id;
  const sellerNet = order.subtotal_amount - order.seller_fee_amount;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
        {listing?.title ?? "Order"}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {isSeller ? "You're selling" : "You're buying"} · status: {order.status}
      </p>

      <Card className="mt-5 p-5">
        <div className="flex flex-col gap-1 text-sm">
          <Row label="Item" value={formatMinorPrice(order.subtotal_amount, order.currency)} />
          {isBuyer && <Row label="Buyer protection" value={formatMinorPrice(order.buyer_fee_amount, order.currency)} />}
          <Row label="Total" value={formatMinorPrice(order.total_amount, order.currency)} strong />
          {isSeller && (
            <>
              <Row label="Platform fee" value={`− ${formatMinorPrice(order.seller_fee_amount, order.currency)}`} />
              <Row label="You receive" value={formatMinorPrice(sellerNet, order.currency)} strong />
            </>
          )}
        </div>
      </Card>

      {shipment && (
        <Card className="mt-4 p-4 text-sm text-[var(--color-muted)]">
          Shipment: <span className="text-[var(--color-paper)]">{shipment.status}</span>
          {shipment.tracking_number ? ` · ${shipment.tracking_number}` : ""}
        </Card>
      )}

      {dispute && (
        <Card className="mt-4 border-[color-mix(in_oklab,#ff6b6b_35%,var(--color-line))] p-4 text-sm">
          <span className="text-[var(--color-paper)]">Dispute open</span>
          <span className="text-[var(--color-muted)]"> · {dispute.reason} · {dispute.status}</span>
        </Card>
      )}

      <OrderActions
        orderId={order.id}
        status={order.status}
        isSeller={isSeller}
        isBuyer={isBuyer}
        hasDispute={Boolean(dispute)}
      />
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={strong ? "text-[var(--color-paper)]" : "text-[var(--color-muted)]"}>{value}</span>
    </div>
  );
}
