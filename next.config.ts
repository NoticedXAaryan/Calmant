import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Required for Cloud Run deployment (C-1, C-7)
  // Produces standalone output that can run with `node server.js`
  output: "standalone",

  // better-sqlite3 is a native Node module — must be excluded from bundling
  serverExternalPackages: ["better-sqlite3", "@whiskeysockets/baileys", "jimp", "sharp"],
};

export default nextConfig;

