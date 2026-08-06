"use client";

import * as React from "react";
import { usernameSchema } from "@owy/validation";
import { Button } from "@/components/ui";
import { COUNTRIES } from "@/lib/countries";
import { updateProfile } from "./actions";

const inputCls =
  "rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2.5 text-[var(--color-paper)] outline-none placeholder:text-[color-mix(in_oklab,var(--color-muted)_70%,transparent)] focus:border-[color-mix(in_oklab,var(--color-paper)_45%,transparent)]";
const labelCls = "text-sm text-[var(--color-muted)]";

export function ProfileEditForm({
  initial,
}: {
  initial: {
    username: string;
    displayName: string;
    bio: string;
    city: string;
    countryCode: string;
  };
}) {
  const [username, setUsername] = React.useState(initial.username);
  const [displayName, setDisplayName] = React.useState(initial.displayName);
  const [bio, setBio] = React.useState(initial.bio);
  const [city, setCity] = React.useState(initial.city);
  const [countryCode, setCountryCode] = React.useState(initial.countryCode);

  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const usernameError = React.useMemo(() => {
    const r = usernameSchema.safeParse(username);
    return r.success ? null : (r.error.issues[0]?.message ?? "Invalid username.");
  }, [username]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile({ username, displayName, bio, city, countryCode });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-[color-mix(in_oklab,#ff6b6b_50%,var(--color-line))] bg-[color-mix(in_oklab,#ff6b6b_12%,transparent)] px-3 py-2 text-sm text-[var(--color-paper)]"
        >
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-paper)]">
          Saved.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className={labelCls}>Username</label>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3">
          <span className="text-[var(--color-muted)]">@</span>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent py-2.5 text-[var(--color-paper)] outline-none"
          />
        </div>
        {username !== initial.username && usernameError ? (
          <p className="text-sm text-[color-mix(in_oklab,#ff9b9b_85%,var(--color-paper))]">{usernameError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className={labelCls}>Display name</label>
        <input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          placeholder="How your name appears"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className={labelCls}>Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="A line or two about you"
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className={labelCls}>City</label>
          <input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country" className={labelCls}>Country</label>
          <select
            id="country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>Select…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending || !!usernameError}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
