import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Required for Cloud Run deployment (C-1, C-7)
  // Produces standalone output that can run with `node server.js`
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
