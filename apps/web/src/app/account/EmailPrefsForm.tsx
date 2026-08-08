"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { updateEmailPrefs, type EmailPrefs } from "./actions";

const rowCls = "flex items-center justify-between gap-4 py-2";
const labelCls = "text-sm text-[var(--color-paper)]";
const hintCls = "text-xs text-[var(--color-muted)]";

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[var(--color-gold,#e9c46a)]" : "bg-[var(--color-line)]"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-paper)] transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function EmailPrefsForm({ initial }: { initial: EmailPrefs }) {
  const [prefs, setPrefs] = React.useState<EmailPrefs>(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function set<K extends keyof EmailPrefs>(key: K, value: boolean) {
    setSaved(false);
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateEmailPrefs(prefs);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  const masterOff = !prefs.email_enabled;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <p className={hintCls}>
        In-app notifications are always on. These control which of them also reach
        your inbox. We only email a verified address.
      </p>

      <div className={rowCls}>
        <div>
          <div className={labelCls}>Email notifications</div>
          <div className={hintCls}>Master switch for all transactional email.</div>
        </div>
        <Toggle
          label="Email notifications"
          checked={prefs.email_enabled}
          onChange={(v) => set("email_enabled", v)}
        />
      </div>

      <div className="border-t border-[var(--color-line)]" />

      <div className={rowCls}>
        <div className={labelCls}>Offers</div>
        <Toggle
          label="Offer emails"
          checked={prefs.email_offers}
          disabled={masterOff}
          onChange={(v) => set("email_offers", v)}
        />
      </div>
      <div className={rowCls}>
        <div className={labelCls}>Sales</div>
        <Toggle
          label="Sale emails"
          checked={prefs.email_sales}
          disabled={masterOff}
          onChange={(v) => set("email_sales", v)}
        />
      </div>
      <div className={rowCls}>
        <div className={labelCls}>New messages</div>
        <Toggle
          label="Message emails"
          checked={prefs.email_messages}
          disabled={masterOff}
          onChange={(v) => set("email_messages", v)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[#ff8f8f]">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-sm text-[var(--color-muted)]">Saved.</p> : null}

      <div className="mt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
