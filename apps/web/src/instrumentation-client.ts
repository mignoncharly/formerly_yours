import * as Sentry from "@sentry/nextjs";

// Client-side Sentry init. No-op until NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  // Session Replay off by default (privacy-sensitive product); enable later.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  debug: false,
});

// Instrument App Router client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
