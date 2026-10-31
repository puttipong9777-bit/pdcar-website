import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  images: {
    // Serve public media directly; do not depend on Vercel or paid Images bindings.
    unoptimized: true,
    // Vehicle-photo URLs use immutable file IDs. Keep their optimized variants
    // for a full month and only generate the sizes a showroom page can display.
    // This avoids repeatedly creating CDN cache entries for the same car photo.
    minimumCacheTTL: 2_678_400,
    formats: ["image/webp"],
    qualities: [75],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256],
    remotePatterns: [
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "pdcar-erp-history.onrender.com" },
      ...(process.env.ALLOW_LOCAL_MEDIA_FIXTURES === "true" ? [{ protocol: "http" as const, hostname: "127.0.0.1" }] : [])
    ]
  }
};

export default nextConfig;
