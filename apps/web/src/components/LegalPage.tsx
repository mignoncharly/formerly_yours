import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

// Single source of truth for the operator's legal identity, referenced by
// /terms, /privacy, and /impressum. Sole proprietor (Einzelunternehmen) — the
// Impressum must name the natural person, so `legalName` is the person's full
// name (business name is a trading name only).
export const OPERATOR = {
  legalName: "Nguenkam Charles", // sole proprietor's full legal name (Vor- und Nachname)
  tradingAs: "Gestiona Tech",
  street: "Nikolausstraße 6",
  city: "55120 Mainz",
  country: "Germany",
  taxNumber: "26/122/60069", // Steuernummer
  vatId: "DE455342848", // USt-IdNr.
  contactEmail: "legal@gestionatech.de",
  privacyEmail: "privacy@gestionatech.de",
  jurisdiction: "Germany",
};

/** "Name, trading as X" — the operator line used across the legal pages. */
export function operatorLine(): string {
  return `${OPERATOR.legalName}, trading as “${OPERATOR.tradingAs}”`;
}

/** "Street, City, Country" one-line address. */
export function operatorAddress(): string {
  return `${OPERATOR.street}, ${OPERATOR.city}, ${OPERATOR.country}`;
}

// Shared shell for /terms and /privacy: branded header, readable prose column,
// and a footer with cross-links. Content is passed as children built from the
// small typographic helpers exported below.
export function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh px-5 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Once Was Yours home">
            <Logo />
          </Link>
          <Link href="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-paper)]">
            ← Home
          </Link>
        </header>

        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-paper)]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-faint)]">Last updated: {lastUpdated}</p>
          {intro ? <div className="mt-4 text-[var(--color-muted)]">{intro}</div> : null}
        </div>

        <article className="flex flex-col gap-6 leading-relaxed text-[var(--color-muted)]">
          {children}
        </article>

        <footer className="mt-4 flex flex-wrap gap-4 border-t border-[var(--color-line)] pt-6 text-sm">
          <Link href="/terms" className="text-[var(--color-muted)] hover:text-[var(--color-paper)]">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-[var(--color-muted)] hover:text-[var(--color-paper)]">
            Privacy Policy
          </Link>
          <Link href="/impressum" className="text-[var(--color-muted)] hover:text-[var(--color-paper)]">
            Impressum
          </Link>
          <Link href="/withdrawal" className="text-[var(--color-muted)] hover:text-[var(--color-paper)]">
            Withdrawal
          </Link>
          <span className="text-[var(--color-faint)]">
            © {new Date().getFullYear()} Once Was Yours
          </span>
        </footer>
      </div>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-paper)]">
        {heading}
      </h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

// Standing disclaimer. Shown only while a required detail is still a placeholder
// (i.e. the operator's full legal name). Once OPERATOR.legalName is filled in,
// this renders nothing.
export function ReviewNotice() {
  if (!OPERATOR.legalName.startsWith("[")) return null;
  return (
    <div className="rounded-xl border border-[color-mix(in_oklab,#e9c46a_45%,var(--color-line))] bg-[color-mix(in_oklab,#e9c46a_10%,transparent)] px-4 py-3 text-sm text-[var(--color-paper)]">
      <strong>Draft — pending one detail:</strong> the operator&rsquo;s full legal
      name still needs to be filled in before public launch. This document is a
      good-faith template; have a qualified lawyer confirm it fits your business.
    </div>
  );
}
