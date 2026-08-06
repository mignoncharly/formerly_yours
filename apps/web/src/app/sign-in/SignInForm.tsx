"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

type Provider = "google" | "apple";

function callbackUrl(path: string, next: string) {
  const params = new URLSearchParams();
  if (next && next !== "/") params.set("next", next);
  const qs = params.toString();
  return `${window.location.origin}${path}${qs ? `?${qs}` : ""}`;
}

export function SignInForm({
  next,
  initialError,
  oauthEnabled = false,
}: {
  next: string;
  initialError?: string;
  // OAuth (Google/Apple) is gated until real provider apps exist in Supabase,
  // so users never see buttons that dead-end.
  oauthEnabled?: boolean;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [oauthLoading, setOauthLoading] = React.useState<Provider | null>(null);

  async function onEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("sending");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Supabase appends token_hash & type to this URL (magic link / OTP).
        emailRedirectTo: callbackUrl("/auth/confirm", next),
      },
    });

    if (error) {
      setStatus("idle");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  async function onOAuth(provider: Provider) {
    setError(null);
    setOauthLoading(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl("/auth/callback", next),
      },
    });

    // On success the browser is redirected to the provider, so we only reach
    // here on error.
    if (error) {
      setOauthLoading(null);
      setError(error.message);
    }
  }

  if (status === "sent") {
    return (
      <div className="text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
          Check your inbox
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          We sent a sign-in link to <span className="text-[var(--color-paper)]">{email}</span>.
          Open it on this device to continue.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setEmail("");
          }}
          className="mt-4 text-sm text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-paper)]"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-[color-mix(in_oklab,#ff6b6b_50%,var(--color-line))] bg-[color-mix(in_oklab,#ff6b6b_12%,transparent)] px-3 py-2 text-sm text-[var(--color-paper)]"
        >
          {error}
        </p>
      ) : null}

      {oauthEnabled ? (
        <>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOAuth("google")}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOAuth("apple")}
              disabled={oauthLoading !== null}
            >
              {oauthLoading === "apple" ? "Redirecting…" : "Continue with Apple"}
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <span className="h-px flex-1 bg-[var(--color-line)]" />
            or
            <span className="h-px flex-1 bg-[var(--color-line)]" />
          </div>
        </>
      ) : null}

      <form onSubmit={onEmailSubmit} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm text-[var(--color-muted)]">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[var(--color-paper)] outline-none placeholder:text-[color-mix(in_oklab,var(--color-muted)_70%,transparent)] focus:border-[color-mix(in_oklab,var(--color-paper)_45%,transparent)]"
        />
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
        </Button>
      </form>
    </div>
  );
}
