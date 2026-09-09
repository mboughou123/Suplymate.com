import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Only allow hosts we will actually send through next/image.
    // Google Maps / googleusercontent URLs 403 and 502 `/_next/image` on
    // prod — cards prefer local stills or branded fallbacks instead.
    remotePatterns: [
      // Uploaded media (Vercel Blob)
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
    // Remote photos change rarely — cache optimized variants for 31 days.
    minimumCacheTTL: 2678400,
    formats: ["image/avif", "image/webp"],
  },
};

export default withNextIntl(nextConfig);
