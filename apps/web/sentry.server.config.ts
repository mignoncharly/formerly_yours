import * as Sentry from "@sentry/nextjs";

// Server-side Sentry init. No-op until NEXT_PUBLIC_SENTRY_DSN is set.
//
// Transaction (performance) sampling is env-driven so it can be tuned without a
// rebuild: SENTRY_TRACES_SAMPLE_RATE wins; otherwise 100% in dev, 10% in prod.
// Error capture is always 100% — only performance transactions are sampled.
// (Sampling every prod transaction wastes quota and is the main driver of the
// benign per-response listener count; see src/instrumentation.ts.)
const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : process.env.NODE_ENV === "production"
    ? 0.1
    : 1.0;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate,
  debug: false,
});
