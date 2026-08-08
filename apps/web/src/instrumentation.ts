import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Silence a benign warning: Sentry's OpenTelemetry HTTP instrumentation adds
    // a per-request `close` listener to each ServerResponse, which can push a
    // fan-out request just past Node's default cap of 10 ("MaxListenersExceeded
    // Warning: 11 close listeners added to ServerResponse"). Those listeners are
    // removed when the response closes (memory stays flat — verified), so it's a
    // false positive. Raise the cap modestly so a *genuine* unbounded leak would
    // still trip the warning.
    const { EventEmitter } = await import("node:events");
    EventEmitter.defaultMaxListeners = 20;

    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Report errors thrown in nested React Server Components to Sentry.
export const onRequestError = Sentry.captureRequestError;
