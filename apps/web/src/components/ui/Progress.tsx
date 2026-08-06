/** Funding progress bar (Next Chapter). Wraps the `.owy-progress` token class. */
export function Progress({
  value,
  className = "",
  label,
}: {
  value: number; // 0..100
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`owy-progress ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
