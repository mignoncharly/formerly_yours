import * as Sentry from "@sentry/nextjs";

// Server-side Sentry init. No-op until NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
});
