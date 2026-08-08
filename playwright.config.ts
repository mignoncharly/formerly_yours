import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against a live deployment (default: production). Override with
// PLAYWRIGHT_BASE_URL to point at a preview or a locally-served build.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://oncewasyours.com";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
