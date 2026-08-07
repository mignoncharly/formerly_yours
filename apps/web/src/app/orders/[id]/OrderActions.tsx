"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { completeOrder, markDelivered, markShipped, openDispute } from "./actions";

const DISPUTE_REASONS: { value: string; label: string }[] = [
  { value: "item_never_arrived", label: "Item never arrived" },
  { value: "different_item", label: "Different item" },
  { value: "major_damage", label: "Major undisclosed damage" },
  { value: "counterfeit", label: "Counterfeit" },
  { value: "other", label: "Other" },
];

export function OrderActions({
  orderId,
  status,
  isSeller,
  isBuyer,
  hasDispute,
}: {
  orderId: string;
  status: string;
  isSeller: boolean;
  isBuyer: boolean;
  hasDispute: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [disputing, setDisputing] = React.useState(false);
  const [reason, setReason] = React.useState("item_never_arrived");
  const [details, setDetails] = React.useState("");

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Action failed.");
  }

  const canDispute = isBuyer && !hasDispute && ["paid", "shipped", "delivered"].includes(status);

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {isSeller && status === "paid" && (
          <Button type="button" disabled={busy} onClick={() => run(() => markShipped(orderId))}>
            Mark as shipped
          </Button>
        )}
        {status === "shipped" && (
          <Button type="button" disabled={busy} onClick={() => run(() => markDelivered(orderId))}>
            Mark delivered
          </Button>
        )}
        {isBuyer && status === "delivered" && (
          <Button type="button" disabled={busy} onClick={() => run(() => completeOrder(orderId))}>
            Confirm receipt
          </Button>
        )}
        {canDispute && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setDisputing((d) => !d)}>
            Open a dispute
          </Button>
        )}
      </div>

      {disputing && canDispute && (
        <div className="rounded-lg border border-[var(--color-line)] p-3">
          <select
            className="mb-2 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-paper)]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {DISPUTE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            className="mb-2 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-paper)]"
            placeholder="What happened? (private)"
            value={details}
            maxLength={1000}
            onChange={(e) => setDetails(e.target.value)}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => run(() => openDispute(orderId, reason, details))}
          >
            Submit dispute
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">{error}</p>
      )}
    </div>
  );
}
