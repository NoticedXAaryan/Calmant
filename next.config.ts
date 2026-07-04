import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "@whiskeysockets/baileys", "jimp", "sharp", "mem0ai", "pg"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
