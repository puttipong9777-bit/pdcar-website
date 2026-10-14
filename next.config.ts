import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "pdcar-platform.vercel.app" },
      { protocol: "https", hostname: "pdcar-erp-history.onrender.com" }
    ]
  }
};

export default nextConfig;
