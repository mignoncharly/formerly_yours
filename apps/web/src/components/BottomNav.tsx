import Link from "next/link";

// §5.1 — primary navigation. (Inbox/messaging arrives in Phase 8.)
const ITEMS: { href: string; label: string; icon: string }[] = [
  { href: "/feed", label: "Home", icon: "⌂" },
  { href: "/browse", label: "Discover", icon: "⌕" },
  { href: "/sell", label: "Sell", icon: "＋" },
  { href: "/messages", label: "Inbox", icon: "✉" },
  { href: "/account", label: "You", icon: "☺" },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[var(--color-ink)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-paper)]"
          >
            <span className="text-lg leading-none">{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
