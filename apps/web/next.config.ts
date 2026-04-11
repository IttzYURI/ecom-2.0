import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
  },
  serverExternalPackages: ["mongodb"]
};

export default nextConfig;
