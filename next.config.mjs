/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output produces a self-contained server bundle that is easy to
  // run behind nginx on the Ubuntu VPS (IONOS). See docs/deployment.md.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
