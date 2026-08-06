"use client";

import * as React from "react";
import { usernameSchema, type ProfileIntent } from "@owy/validation";
import { Button, Progress } from "@/components/ui";
import { COUNTRIES } from "@/lib/countries";
import { completeOnboarding } from "./actions";

type Step = "intent" | "username" | "country" | "avatar" | "rules";
const STEPS: Step[] = ["intent", "username", "country", "avatar", "rules"];

const INTENTS: { value: ProfileIntent; title: string; blurb: string }[] = [
  { value: "sell", title: "Sell", blurb: "Turn a chapter you've closed into what's next." },
  { value: "browse", title: "Browse", blurb: "Find things worth having — with a story attached." },
  { value: "both", title: "Both", blurb: "A bit of clearing out, a bit of treasure hunting." },
];

export function OnboardingWizard({
  initialUsername,
}: {
  initialUsername: string | null;
}) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const step = STEPS[stepIndex]!;

  const [intent, setIntent] = React.useState<ProfileIntent | null>(null);
  const [username, setUsername] = React.useState(initialUsername ?? "");
  const [country, setCountry] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const usernameError = React.useMemo(() => {
    if (username.length === 0) return null;
    const result = usernameSchema.safeParse(username);
    return result.success ? null : (result.error.issues[0]?.message ?? "Invalid username.");
  }, [username]);

  function back() {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function next() {
    setError(null);
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }

  const canAdvance =
    (step === "intent" && intent !== null) ||
    (step === "username" && username.length > 0 && !usernameError) ||
    (step === "country" && country !== "") ||
    step === "avatar" ||
    (step === "rules" && agreed);

  function finish() {
    if (!intent || !agreed) return;
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        intent,
        username,
        countryCode: country,
      });
      // On success the action redirects; we only get here on error.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Progress
        value={((stepIndex + 1) / STEPS.length) * 100}
        label={`Step ${stepIndex + 1} of ${STEPS.length}`}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-[color-mix(in_oklab,#ff6b6b_50%,var(--color-line))] bg-[color-mix(in_oklab,#ff6b6b_12%,transparent)] px-3 py-2 text-sm text-[var(--color-paper)]"
        >
          {error}
        </p>
      ) : null}

      {step === "intent" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
            What brings you here?
          </legend>
          {INTENTS.map((opt) => {
            const selected = intent === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIntent(opt.value)}
                aria-pressed={selected}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-[color-mix(in_oklab,var(--color-paper)_55%,transparent)] bg-[var(--color-surface-2)]"
                    : "border-[var(--color-line)] hover:border-[color-mix(in_oklab,var(--color-paper)_35%,transparent)]"
                }`}
              >
                <span className="block text-[var(--color-paper)]">{opt.title}</span>
                <span className="mt-1 block text-sm text-[var(--color-muted)]">{opt.blurb}</span>
              </button>
            );
          })}
        </fieldset>
      ) : null}

      {step === "username" ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
            Pick a username
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            This is your public handle. Lowercase letters, numbers and underscores.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3">
            <span className="text-[var(--color-muted)]">@</span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="yourname"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent py-2.5 text-[var(--color-paper)] outline-none placeholder:text-[color-mix(in_oklab,var(--color-muted)_70%,transparent)]"
            />
          </div>
          {usernameError ? (
            <p className="text-sm text-[color-mix(in_oklab,#ff9b9b_85%,var(--color-paper))]">{usernameError}</p>
          ) : null}
        </div>
      ) : null}

      {step === "country" ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
            Where are you based?
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            We use this for shipping and local discovery. Your exact address is never public.
          </p>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[var(--color-paper)] outline-none"
          >
            <option value="" disabled>
              Select a country…
            </option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {step === "avatar" ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
            Add a photo (optional)
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            You can add a profile photo later from your account. Let&apos;s keep going for now.
          </p>
        </div>
      ) : null}

      {step === "rules" ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
            Our one rule
          </h2>
          <p className="text-[var(--color-paper)]">
            <strong>Tell your story. Never expose theirs.</strong>
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Share what an object meant to you — not other people&apos;s private details, names,
            faces or messages. Be kind. No harassment, no illegal or unsafe items.
          </p>
          <label className="mt-2 flex items-start gap-3 text-sm text-[var(--color-paper)]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-paper)]"
            />
            <span>I understand and agree to the community rules.</span>
          </label>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {stepIndex > 0 ? (
          <Button type="button" variant="ghost" onClick={back} disabled={pending}>
            Back
          </Button>
        ) : (
          <span />
        )}

        {step === "rules" ? (
          <Button type="button" onClick={finish} disabled={!canAdvance || pending}>
            {pending ? "Setting up…" : "Enter Once Was Yours"}
          </Button>
        ) : (
          <Button type="button" onClick={next} disabled={!canAdvance}>
            {step === "avatar" ? "Skip for now" : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}
