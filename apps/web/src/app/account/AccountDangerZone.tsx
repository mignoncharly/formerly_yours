"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { deactivateAccount, reactivateAccount, deleteAccount } from "./actions";

export function AccountDangerZone({ deactivated }: { deactivated: boolean }) {
  const [error, setError] = React.useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      // deactivate/delete redirect on success; we only return here on error.
      if (result?.error) setError(result.error);
    });
  }

  if (deactivated) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          Your account is deactivated and hidden. You can reactivate it any time.
        </p>
        {error ? <p role="alert" className="text-sm text-[color-mix(in_oklab,#ff9b9b_85%,var(--color-paper))]">{error}</p> : null}
        <div>
          <Button type="button" onClick={() => run(reactivateAccount)} disabled={pending}>
            {pending ? "Reactivating…" : "Reactivate account"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p role="alert" className="text-sm text-[color-mix(in_oklab,#ff9b9b_85%,var(--color-paper))]">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">
          Deactivate to hide your profile and listings. Reversible — sign back in to reactivate.
        </p>
        <div>
          <Button type="button" variant="ghost" onClick={() => run(deactivateAccount)} disabled={pending}>
            Deactivate account
          </Button>
        </div>
      </div>

      <hr className="border-[var(--color-line)]" />

      <div className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-muted)]">
          Permanently delete your account and data. This cannot be undone.
        </p>
        {confirmingDelete ? (
          <div className="flex flex-col gap-3 rounded-lg border border-[color-mix(in_oklab,#ff6b6b_45%,var(--color-line))] p-3">
            <p className="text-sm text-[var(--color-paper)]">
              This is permanent. Delete your account?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => run(deleteAccount)}
                disabled={pending}
                className="owy-btn !border-[color-mix(in_oklab,#ff6b6b_60%,var(--color-line))] !text-[color-mix(in_oklab,#ff9b9b_85%,var(--color-paper))]"
              >
                {pending ? "Deleting…" : "Yes, delete permanently"}
              </button>
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="owy-btn owy-btn-ghost !border-[color-mix(in_oklab,#ff6b6b_45%,var(--color-line))] !text-[color-mix(in_oklab,#ff9b9b_85%,var(--color-paper))]"
            >
              Delete account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
