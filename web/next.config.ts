import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow better-sqlite3 native module in server components
  serverExternalPackages: ["better-sqlite3"],
  output: "standalone",
};

export default nextConfig;
