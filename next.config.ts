import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds for Vercel deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds with TypeScript errors (warnings only)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
