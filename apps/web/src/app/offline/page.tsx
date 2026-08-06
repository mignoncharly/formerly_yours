import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Offline",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-6 text-center">
      <div>
        <Logo />
        <div className="mt-6 text-5xl">📦</div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl">
          You&apos;re offline
        </h1>
        <p className="mt-2 max-w-sm text-[var(--color-muted)]">
          The stories are waiting. Reconnect and they&apos;ll be right here.
        </p>
        <Link href="/" className="owy-btn owy-btn-primary mt-6 inline-flex">
          Try again
        </Link>
      </div>
    </main>
  );
}
