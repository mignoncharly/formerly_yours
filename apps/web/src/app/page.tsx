import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LandingAnalytics } from "@/components/landing/LandingAnalytics";
import { CtaButtons } from "@/components/landing/CtaButtons";
import { ExampleStoryCard } from "@/components/ExampleStoryCard";
import { Waitlist } from "@/components/landing/Waitlist";
import { FEED } from "@/lib/fixtures";
import { formatMoney } from "@/lib/reference";

const example = FEED[0]!; // MacBook Pro — "At least they had taste"

export default function LandingPage() {
  return (
    <main>
      <LandingAnalytics />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-ink)_82%,transparent)] backdrop-blur">
        <div className="owy-container flex h-16 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/feed" className="owy-btn owy-btn-ghost !px-4 !py-2 text-sm">
              See the feed
            </Link>
            <a href="#waitlist" className="owy-btn owy-btn-primary !px-4 !py-2 text-sm">
              Join
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 15% 0%, #ff5d8f22, transparent 60%), radial-gradient(50% 45% at 90% 10%, #5ce1a822, transparent 60%)",
          }}
        />
        <div className="owy-container relative grid gap-12 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div className="owy-rise">
            <span className="owy-eyebrow">Every object has a story</span>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-[1.05] sm:text-6xl">
              Sell the past.
              <br />
              <span style={{ color: "var(--color-chapter)" }}>Fund</span> what&apos;s
              next.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--color-muted)]">
              A marketplace where the things a chapter of your life left behind
              become the story people come to read — and the money that funds
              whatever comes next.
            </p>

            <div className="mt-8">
              <CtaButtons />
            </div>

            <p className="mt-4 text-sm text-[var(--color-faint)]">
              Two kinds of people welcome: those with something to sell, and
              those who just want the stories.
            </p>
          </div>

          {/* Example story */}
          <div className="owy-rise" style={{ animationDelay: "0.1s" }}>
            <ExampleStoryCard item={example} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--color-line)] py-16">
        <div className="owy-container">
          <span className="owy-eyebrow">How it works</span>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            An object. A story. A new beginning.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Sell the object",
                d: "List the thing a relationship, a move, or a chapter left behind. Classic marketplace details — price, condition, photos.",
                e: "🏷️",
              },
              {
                n: "02",
                t: "Tell the story",
                d: "Add why it exists here. Clean Break, a Little Tea, or the Full Story — public or anonymous. Our AI helps you say it, never invents it.",
                e: "🍿",
              },
              {
                n: "03",
                t: "Fund what's next",
                d: "Point the sale at your Next Chapter — a solo trip, a new home, a fresh start. Real sales fund it, not donations.",
                e: "🌱",
              },
            ].map((s) => (
              <div key={s.n} className="owy-card p-6">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{s.e}</span>
                  <span className="text-sm font-bold text-[var(--color-faint)]">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fund My Next Chapter + example chapter */}
      <section className="border-t border-[var(--color-line)] py-16">
        <div className="owy-container grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="owy-eyebrow" style={{ color: "var(--color-chapter)" }}>
              Fund My Next Chapter
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
              Not crowdfunding. The money comes from real sales.
            </h2>
            <p className="mt-4 text-[var(--color-muted)]">
              Every seller can set a goal — <em>“€640 / €1,500 — my first solo
              trip.”</em> Several sales can feed the same chapter. When the item
              ships, the progress moves. When a refund happens, it moves back.
              It always reflects what actually happened.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--color-muted)]">
              <li>✓ Progress is calculated from real transactions, never typed in.</li>
              <li>✓ After a sale, the story doesn&apos;t die — you post “What happened next.”</li>
              <li>✓ Buyers get to be part of someone&apos;s fresh start.</li>
            </ul>
          </div>

          {/* Example New Chapter card */}
          <div className="owy-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl">🌴</div>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl">
                  First Solo Trip
                </h3>
              </div>
              <span className="owy-chip">3 items sold</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-[var(--color-chapter)]">
                {formatMoney(84000)}
              </span>
              <span className="text-[var(--color-faint)]">
                of {formatMoney(150000)}
              </span>
            </div>
            <div className="owy-progress mt-2">
              <span style={{ width: "56%" }} />
            </div>
            <div className="mt-5 space-y-2">
              {[
                { i: "⌚", n: "Watch", v: 22000 },
                { i: "🎮", n: "PS5", v: 32000 },
                { i: "👜", n: "Bag", v: 30000 },
              ].map((row) => (
                <div
                  key={row.n}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                >
                  <span>
                    {row.i} {row.n}
                  </span>
                  <span className="text-[var(--color-muted)]">
                    ✓ {formatMoney(row.v)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-[var(--color-faint)]">
              Example only — figures are illustrative during Phase 0.
            </p>
          </div>
        </div>
      </section>

      {/* Safety philosophy */}
      <section className="border-t border-[var(--color-line)] py-16">
        <div className="owy-container max-w-3xl text-center">
          <span className="owy-eyebrow">Safety by design</span>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl italic sm:text-4xl">
            “Tell your story. Never expose theirs.”
          </h2>
          <p className="mt-5 text-[var(--color-muted)]">
            This only works if it stays kind. It is not a place for revenge.
            We detect and block names, addresses, phones, handles, private
            screenshots and identifying photos of other people. AI moderation
            reviews every story, humans review the hard cases, and you may only
            sell what you own.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "No real names",
              "No doxxing",
              "AI + human moderation",
              "Anonymous mode",
              "You own what you sell",
            ].map((t) => (
              <span key={t} className="owy-chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="border-t border-[var(--color-line)] py-16">
        <div className="owy-container grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="owy-eyebrow">Be early</span>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
              Join the waitlist
            </h2>
            <p className="mt-4 max-w-md text-[var(--color-muted)]">
              We&apos;re opening in one country first. Tell us whether you have
              something to sell, want to read the stories, or both — it helps us
              build the right thing first.
            </p>
          </div>
          <Waitlist />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-line)] py-10">
        <div className="owy-container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="text-sm text-[var(--color-faint)]">
            © {new Date().getFullYear()} Once Was Yours · Working name ·
            Concept validation
          </p>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/terms" className="text-[var(--color-muted)] hover:text-[var(--color-paper)]">
              Terms
            </Link>
            <Link href="/privacy" className="text-[var(--color-muted)] hover:text-[var(--color-paper)]">
              Privacy
            </Link>
            <Link href="/impressum" className="text-[var(--color-muted)] hover:text-[var(--color-paper)]">
              Impressum
            </Link>
            <Link
              href="/feed"
              className="font-semibold"
              style={{ color: "var(--color-primary-2)" }}
            >
              Explore the feed →
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
