"use client";

import * as React from "react";

export function StoryShare({ title }: { title: string }) {
  const [url, setUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const links: { label: string; href: string }[] = [
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked
    }
  }

  const chip =
    "rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-paper)]";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Share</span>
      <button type="button" onClick={copy} className={chip}>
        {copied ? "Copied" : "Copy link"}
      </button>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={chip}>
          {l.label}
        </a>
      ))}
    </div>
  );
}
