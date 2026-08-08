import { fileURLToPath } from "node:url";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

// Monorepo root (…/apps/web -> repo root). fileURLToPath decodes spaces in the
// path correctly (important on Windows where the folder name contains a space).
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output produces a self-contained server bundle that is easy to
  // run behind nginx on the Ubuntu VPS (IONOS). See docs/deployment.md.
  output: "standalone",
  // The standalone tracer must include files from the monorepo root.
  outputFileTracingRoot: repoRoot,
  // nodemailer is loaded via a runtime dynamic import (only when the SMTP email
  // provider is selected), so the static tracer misses it. Force it into the
  // standalone bundle so SMTP works regardless of where standalone is deployed.
  outputFileTracingIncludes: {
    "**": ["../../node_modules/.pnpm/nodemailer@*/node_modules/nodemailer/**"],
  },
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript; let Next transpile them.
  transpilePackages: ["@owy/types", "@owy/validation", "@owy/database"],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Quiet during local builds, verbose in CI.
  silent: !process.env.CI,
  telemetry: false,
  // Source-map upload is disabled for now (avoids the @sentry/cli binary under
  // Turbopack). Enable later by setting this to a config object + SENTRY_AUTH_TOKEN.
  sourcemaps: { disable: true },
  // Tunnel Sentry requests through the app to dodge ad-blockers.
  tunnelRoute: "/monitoring",
});
