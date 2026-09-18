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
    // AVIF encoding of the 1–4 MB mill stills was stalling `/_next/image` for
    // minutes on mobile. WebP is fast enough and already cached.
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
  },
};

export default withNextIntl(nextConfig);
