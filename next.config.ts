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
      // Phase-1 mill logo hosts (common CDN / company origins). Unknown hosts
      // still render via plain <img> in SupplierLogo.
      { protocol: "https", hostname: "**.ajsteel.com" },
      { protocol: "https", hostname: "www.ajsteel.com" },
      { protocol: "https", hostname: "**.imimg.com" },
      { protocol: "https", hostname: "**.made-in-china.com" },
      { protocol: "https", hostname: "**.contentstack.io" },
      { protocol: "https", hostname: "**.amazonaws.com" },
    ],
    // Remote photos change rarely — cache optimized variants for 31 days.
    minimumCacheTTL: 2678400,
    formats: ["image/avif", "image/webp"],
  },
};

export default withNextIntl(nextConfig);
