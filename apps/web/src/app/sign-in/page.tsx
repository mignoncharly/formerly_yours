import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Once Was Yours to sell the past and fund what's next.",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Only accept internal, path-relative `next` targets (avoid open redirects).
function safeNext(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(firstParam(params.next));
  const initialError = firstParam(params.error);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Once Was Yours home">
            <Logo />
          </Link>
        </div>

        <Card className="p-6">
          <div className="mb-6 text-center">
            <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-paper)]">
              Welcome
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Sign in or create an account to continue.
            </p>
          </div>

          <SignInForm
            next={next}
            initialError={initialError}
            oauthEnabled={process.env.NEXT_PUBLIC_OAUTH_ENABLED === "true"}
          />
        </Card>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          By continuing you agree to our community rules.
        </p>
      </div>
    </main>
  );
}
