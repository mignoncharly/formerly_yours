"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

type Intent = "sell" | "browse" | "both";
type Status = "idle" | "loading" | "done" | "error";

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState<Intent>("both");
  const [status, setStatus] = useState<Status>("idle");
  const [touched, setTouched] = useState(false);

  // Let the hero's "I have something to sell" CTA preselect the seller intent.
  useEffect(() => {
    function onSetIntent(e: Event) {
      const detail = (e as CustomEvent).detail as Intent;
      if (detail === "sell" || detail === "browse" || detail === "both") {
        setIntent(detail);
      }
    }
    window.addEventListener("fy:set-intent", onSetIntent);
    return () => window.removeEventListener("fy:set-intent", onSetIntent);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent, source: "landing" }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
      track("waitlist_completed", { intent });
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="fy-card fy-rise p-8 text-center">
        <div className="text-4xl">🌱</div>
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl">
          You're on the list.
        </h3>
        <p className="mt-2 text-[var(--color-muted)]">
          We'll reach out when your first chapter can begin.
          {intent !== "browse" && " Early sellers get in first."}
        </p>
      </div>
    );
  }

  const options: { key: Intent; label: string; emoji: string }[] = [
    { key: "sell", label: "Sell something", emoji: "🏷️" },
    { key: "browse", label: "Read the stories", emoji: "🍿" },
    { key: "both", label: "A bit of both", emoji: "✨" },
  ];

  return (
    <form onSubmit={onSubmit} className="fy-card p-6 sm:p-8">
      <fieldset className="mb-4">
        <legend className="fy-eyebrow mb-2">What brings you here?</legend>
        <div className="grid grid-cols-3 gap-2">
          {options.map((o) => {
            const active = intent === o.key;
            return (
              <button
                type="button"
                key={o.key}
                onClick={() => setIntent(o.key)}
                aria-pressed={active}
                className="rounded-xl border px-2 py-3 text-sm font-semibold transition"
                style={{
                  borderColor: active
                    ? "var(--color-primary)"
                    : "var(--color-line)",
                  background: active
                    ? "color-mix(in oklab, var(--color-primary) 16%, transparent)"
                    : "transparent",
                  color: active ? "var(--color-paper)" : "var(--color-muted)",
                }}
              >
                <span className="block text-lg">{o.emoji}</span>
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mb-2 block text-sm font-medium text-[var(--color-muted)]">
        Email
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => {
            if (!touched) {
              setTouched(true);
              track("waitlist_started", { intent });
            }
          }}
          className="w-full rounded-full border px-5 py-3 text-base outline-none"
          style={{
            background: "var(--color-ink-2)",
            borderColor: "var(--color-line)",
            color: "var(--color-paper)",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="fy-btn fy-btn-primary shrink-0 disabled:opacity-60"
        >
          {status === "loading" ? "Joining…" : "Join the waitlist"}
        </button>
      </div>

      {status === "error" && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-primary-2)" }}>
          Something went wrong — please try again.
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--color-faint)]">
        No spam. One email when we open. You can leave anytime.
      </p>
    </form>
  );
}
