// Unit tests for the vendor-agnostic email core. Run with:
//   node --import tsx --test tests/unit/*.test.ts   (pnpm test:unit)
// No network, no DB — pure provider-selection + retry logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProvider, sendWithRetry, NoopEmailProvider } from "../../apps/web/src/lib/email/core";
import { LogEmailProvider } from "../../apps/web/src/lib/email/providers/log";
import { ResendEmailProvider } from "../../apps/web/src/lib/email/providers/resend";
import type { EmailProvider, EmailSendResult } from "../../apps/web/src/lib/email/types";

const msg = { to: "a@b.com", subject: "s", html: "<p>h</p>" };

test("buildProvider: auto picks resend when RESEND_API_KEY is set", () => {
  const { provider } = buildProvider({ RESEND_API_KEY: "re_x" });
  assert.equal(provider.name, "resend");
});

test("buildProvider: auto picks smtp when SMTP creds are set", () => {
  const { provider } = buildProvider({ SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASS: "p" });
  assert.equal(provider.name, "smtp");
});

test("buildProvider: auto falls back to noop with no credentials", () => {
  const { provider } = buildProvider({});
  assert.equal(provider.name, "none");
});

test("buildProvider: explicit resend without key warns and noops", () => {
  const { provider, warnings } = buildProvider({ OWY_EMAIL_PROVIDER: "resend" });
  assert.equal(provider.name, "none");
  assert.equal(warnings.length, 1);
});

test("buildProvider: explicit log always selects log provider", () => {
  const { provider } = buildProvider({ OWY_EMAIL_PROVIDER: "log", RESEND_API_KEY: "re_x" });
  assert.equal(provider.name, "log");
});

test("buildProvider: explicit smtp with incomplete creds warns and noops", () => {
  const { provider, warnings } = buildProvider({ OWY_EMAIL_PROVIDER: "smtp", SMTP_HOST: "h" });
  assert.equal(provider.name, "none");
  assert.equal(warnings.length, 1);
});

test("LogEmailProvider never throws and reports ok", async () => {
  const res = await new LogEmailProvider().send(msg);
  assert.equal(res.ok, true);
});

test("NoopEmailProvider reports ok", async () => {
  const res = await new NoopEmailProvider().send();
  assert.equal(res.ok, true);
});

test("sendWithRetry: retries a retryable failure then succeeds", async () => {
  let calls = 0;
  const flaky: EmailProvider = {
    name: "flaky",
    async send(): Promise<EmailSendResult> {
      calls++;
      if (calls < 2) return { ok: false, error: "500", retryable: true };
      return { ok: true, id: "ok" };
    },
  };
  const res = await sendWithRetry(flaky, msg, { backoffMs: 0 });
  assert.equal(res.ok, true);
  assert.equal(calls, 2);
});

test("sendWithRetry: does NOT retry a terminal failure", async () => {
  let calls = 0;
  const terminal: EmailProvider = {
    name: "terminal",
    async send(): Promise<EmailSendResult> {
      calls++;
      return { ok: false, error: "400 bad address", retryable: false };
    },
  };
  const res = await sendWithRetry(terminal, msg, { backoffMs: 0 });
  assert.equal(res.ok, false);
  assert.equal(calls, 1);
});

test("sendWithRetry: gives up after maxAttempts on persistent retryable failure", async () => {
  let calls = 0;
  const down: EmailProvider = {
    name: "down",
    async send(): Promise<EmailSendResult> {
      calls++;
      return { ok: false, error: "503", retryable: true };
    },
  };
  const res = await sendWithRetry(down, msg, { backoffMs: 0, maxAttempts: 3 });
  assert.equal(res.ok, false);
  assert.equal(calls, 3);
});

test("sendWithRetry: treats a thrown provider error as retryable", async () => {
  let calls = 0;
  const thrower: EmailProvider = {
    name: "thrower",
    async send(): Promise<EmailSendResult> {
      calls++;
      if (calls < 2) throw new Error("socket hang up");
      return { ok: true };
    },
  };
  const res = await sendWithRetry(thrower, msg, { backoffMs: 0 });
  assert.equal(res.ok, true);
  assert.equal(calls, 2);
});

test("ResendEmailProvider: classifies 5xx as retryable, 4xx as terminal", async () => {
  const provider = new ResendEmailProvider("re_x", "from@x.com");
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response("boom", { status: 500 })) as typeof fetch;
    const r5 = await provider.send(msg);
    assert.equal(r5.ok, false);
    assert.equal(r5.ok === false && r5.retryable, true);

    globalThis.fetch = (async () =>
      new Response("bad", { status: 422 })) as typeof fetch;
    const r4 = await provider.send(msg);
    assert.equal(r4.ok, false);
    assert.equal(r4.ok === false && r4.retryable, false);

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ id: "abc" }), { status: 200 })) as typeof fetch;
    const ok = await provider.send(msg);
    assert.equal(ok.ok, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});
