import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side app → export to static HTML/JS that any CDN can serve.
  // `pnpm build` produces an `out/` folder; nothing runs on a server.
  output: "export",
};

export default nextConfig;
