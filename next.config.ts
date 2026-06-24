import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloud Run deployment (C-1, C-7)
  // Produces standalone output that can run with `node server.js`
  output: "standalone",
};

export default nextConfig;
