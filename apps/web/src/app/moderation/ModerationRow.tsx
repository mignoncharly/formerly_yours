"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Report } from "@owy/database/types";
import { Card } from "@/components/ui";
import { moderateContent, resolveReport, suspendUser } from "./actions";

function targetOf(r: Report): { type: string; id: string } | null {
  if (r.story_id) return { type: "story", id: r.story_id };
  if (r.comment_id) return { type: "comment", id: r.comment_id };
  if (r.listing_id) return { type: "listing", id: r.listing_id };
  if (r.chapter_id) return { type: "chapter", id: r.chapter_id };
  if (r.reported_user_id) return { type: "user", id: r.reported_user_id };
  return null;
}

const btn =
  "rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-paper)] disabled:opacity-50";

export function ModerationRow({ report }: { report: Report }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const target = targetOf(report);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Action failed.");
  }

  const removable = target && ["story", "comment", "listing"].includes(target.type);

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[var(--color-paper)]">{report.reason}</span>
        <span className="text-xs text-[var(--color-muted)]">
          {target ? `${target.type}` : "—"} · {new Date(report.created_at).toLocaleDateString()}
        </span>
      </div>
      {report.details && (
        <p className="mt-1 text-sm text-[var(--color-muted)]">{report.details}</p>
      )}
      {target && (
        <p className="mt-1 break-all text-xs text-[var(--color-faint)]">{target.id}</p>
      )}

      {error && (
        <p className="mt-2 text-xs text-[color-mix(in_oklab,#ff6b6b_85%,var(--color-paper))]">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {removable && target && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            onClick={() => run(() => moderateContent(target.type, target.id, "removed", `report:${report.reason}`))}
          >
            Remove content
          </button>
        )}
        {report.reported_user_id && (
          <button
            type="button"
            disabled={busy}
            className={btn}
            onClick={() => run(() => suspendUser(report.reported_user_id!, true, `report:${report.reason}`))}
          >
            Suspend user
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          className={btn}
          onClick={() => run(() => resolveReport(report.id, "resolved", "reviewed"))}
        >
          Resolve
        </button>
        <button
          type="button"
          disabled={busy}
          className={btn}
          onClick={() => run(() => resolveReport(report.id, "dismissed", "no action"))}
        >
          Dismiss
        </button>
      </div>
    </Card>
  );
}
