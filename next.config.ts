import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Avoid Turbopack accidentally selecting a parent workspace root when multiple lockfiles exist.
    root: __dirname,
  },
  async redirects() {
    return [
      // 旧扩展 (v0.1.x) 与旧书签兼容：/connect/bilibili → /connect/extension
      {
        source: "/connect/bilibili",
        destination: "/connect/extension",
        permanent: true,
      },
      {
        source: "/connect/bilibili/:path*",
        destination: "/connect/extension/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
