import { fileURLToPath } from "node:url";
import path from "node:path";

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
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript; let Next transpile them.
  transpilePackages: ["@owy/types", "@owy/validation", "@owy/database"],
};

export default nextConfig;
