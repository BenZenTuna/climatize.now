import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side app → export to static HTML/JS that any CDN can serve.
  // `pnpm build` produces a `dist/` folder; nothing runs on a server.
  // distDir changes the static export output to dist/ (required for Coolify deployment).
  output: "export",
  distDir: "dist",
};

export default nextConfig;
