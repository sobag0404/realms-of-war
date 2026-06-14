import type { NextConfig } from "next";

const isDesktopStaticExport = process.env.REALMS_DESKTOP_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  output: isDesktopStaticExport ? "export" : "standalone",
  reactStrictMode: true,
  ...(isDesktopStaticExport
    ? {
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
