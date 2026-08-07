"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatMinorPrice } from "@/lib/listings";
import { parsePriceToMinor } from "@owy/validation";
import { acceptOffer, counterOffer, declineOffer, withdrawOffer } from "./actions";

export type OfferView = {
  id: string;
  listingTitle: string;
  amount: number;
  status: string;
  proposedByMe: boolean;
  amRecipient: boolean;
  counterpartyLabel: string;
};

const btn =
  "rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-paper)] disabled:opacity-50";

export function OfferRow({ offer }: { offer: OfferView }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [countering, setCountering] = React.useState(false);
  const [counter, setCounter] = React.useState("");

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Action failed.");
  }

  const pending = offer.status === "pending";

  return (
    <div className="rounded-xl border border-[var(--color-line)] p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[var(--color-paper)]">{offer.listingTitle}</span>
        <span className="text-[var(--color-paper)]">{formatMinorPrice(offer.amount)}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {offer.counterpartyLabel} · {offer.status}
        {offer.proposedByMe ? " · your offer" : ""}
      </p>

      {error && <p className="mt-2 text-xs text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">{error}</p>}

      {pending && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {offer.amRecipient && (
            <>
              <button type="button" disabled={busy} className={btn} onClick={() => run(() => acceptOffer(offer.id))}>
                Accept
              </button>
              <button type="button" disabled={busy} className={btn} onClick={() => run(() => declineOffer(offer.id))}>
                Decline
              </button>
              <button type="button" disabled={busy} className={btn} onClick={() => setCountering((c) => !c)}>
                Counter
              </button>
              {countering && (
                <span className="flex items-center gap-1">
                  <input
                    className="w-24 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-paper)]"
                    inputMode="decimal"
                    placeholder="€ amount"
                    value={counter}
                    onChange={(e) => setCounter(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className={btn}
                    onClick={() => {
                      const minor = parsePriceToMinor(counter);
                      if (minor == null) {
                        setError("Enter a valid amount.");
                        return;
                      }
                      run(() => counterOffer(offer.id, minor));
                    }}
                  >
                    Send
                  </button>
                </span>
              )}
            </>
          )}
          {offer.proposedByMe && (
            <button type="button" disabled={busy} className={btn} onClick={() => run(() => withdrawOffer(offer.id))}>
              Withdraw
            </button>
          )}
        </div>
      )}
    </div>
  );
}
