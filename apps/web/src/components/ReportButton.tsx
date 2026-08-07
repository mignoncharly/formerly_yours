"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createReport, type ReportTarget } from "@/app/report/actions";

const REASONS: { value: string; label: string }[] = [
  { value: "doxxing", label: "Doxxing / personal info" },
  { value: "harassment", label: "Harassment" },
  { value: "threat", label: "Threat" },
  { value: "spam", label: "Spam" },
  { value: "stolen_item", label: "Stolen item" },
  { value: "scam", label: "Scam" },
  { value: "counterfeit", label: "Counterfeit" },
  { value: "explicit_content", label: "Explicit content" },
  { value: "hate", label: "Hate" },
  { value: "other", label: "Other" },
];

export function ReportButton({
  target,
  signedIn,
  next,
  label = "Report",
}: {
  target: ReportTarget;
  signedIn: boolean;
  next: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("spam");
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function toggle() {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(next)}`);
      return;
    }
    setOpen((o) => !o);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createReport({ reason, details, target });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setOpen(false);
    } else {
      setError(res.error);
    }
  }

  if (done) {
    return <span className="text-xs text-[var(--color-muted)]">Reported — thank you.</span>;
  }

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={toggle}
        className="text-xs text-[var(--color-muted)] underline underline-offset-4 hover:text-[var(--color-paper)]"
      >
        {label}
      </button>
      {open && (
        <div className="mt-2 w-64 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
          <select
            className="mb-2 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-paper)]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            className="mb-2 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm text-[var(--color-paper)]"
            placeholder="Details (optional)"
            value={details}
            maxLength={1000}
            onChange={(e) => setDetails(e.target.value)}
          />
          {error && <p className="mb-2 text-xs text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="owy-btn owy-btn-primary !px-3 !py-1.5 text-xs"
          >
            {busy ? "Submitting…" : "Submit report"}
          </button>
        </div>
      )}
    </div>
  );
}
