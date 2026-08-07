"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { parsePriceToMinor } from "@owy/validation";
import { Button } from "@/components/ui";
import { makeOffer } from "@/app/offers/actions";
import { startConversation } from "@/app/messages/actions";
import { startCheckout } from "@/app/checkout/actions";

export function BuyerActions({
  listingId,
  sellerId,
  signedIn,
  next,
}: {
  listingId: string;
  sellerId: string;
  signedIn: boolean;
  next: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = React.useState("");
  const [offering, setOffering] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  function requireAuth(): boolean {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return false;
    }
    return true;
  }

  async function submitOffer() {
    if (!requireAuth()) return;
    const minor = parsePriceToMinor(amount);
    if (minor == null) {
      setMsg("Enter a valid amount.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await makeOffer({ listingId, sellerId, amount: minor });
    setBusy(false);
    setMsg(res.ok ? "Offer sent." : res.error);
    if (res.ok) {
      setAmount("");
      setOffering(false);
    }
  }

  async function message() {
    if (!requireAuth()) return;
    await startConversation(listingId); // redirects to the thread
  }

  async function buyNow() {
    if (!requireAuth()) return;
    setBusy(true);
    setMsg(null);
    try {
      await startCheckout(listingId); // redirects to Stripe Checkout
    } catch (e) {
      setBusy(false);
      setMsg(e instanceof Error ? e.message : "Could not start checkout.");
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      <Button type="button" onClick={buyNow} disabled={busy}>
        Buy now
      </Button>
      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={() => (offering ? submitOffer() : setOffering(true))} disabled={busy}>
          {offering ? "Send offer" : "Make an offer"}
        </Button>
        <Button type="button" variant="ghost" onClick={message} disabled={busy}>
          Message seller
        </Button>
      </div>
      {offering && (
        <div className="flex items-center gap-2">
          <span className="text-lg text-[var(--color-muted)]">€</span>
          <input
            className="w-40 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-[var(--color-paper)] outline-none"
            inputMode="decimal"
            placeholder="610"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      )}
      {msg && <p className="text-sm text-[var(--color-muted)]">{msg}</p>}
    </div>
  );
}
