import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { IMAGE_DEVICE_SIZES, IMAGE_INLINE_SIZES } from "./src/lib/image-sizes";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
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
    // AVIF encoding of 1–4 MB mill JPEGs stalls `/_next/image` on phones.
    // WebP is already cached and encodes quickly.
    formats: ["image/webp"],
    // Drop 1920/2048/3840 srcset entries — listing cards never need them, and
    // those URLs were a large share of the 1.3MB /en/suppliers HTML on phones.
    deviceSizes: [...IMAGE_DEVICE_SIZES],
    imageSizes: [...IMAGE_INLINE_SIZES],
  },
};

export default withNextIntl(nextConfig);
