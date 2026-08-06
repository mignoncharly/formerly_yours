export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}
    >
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-lg text-sm font-bold"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary), var(--color-chapter))",
          color: "#160a12",
        }}
      >
        O
      </span>
      <span>
        Once Was<span style={{ color: "var(--color-primary-2)" }}>&nbsp;Yours</span>
      </span>
    </span>
  );
}
