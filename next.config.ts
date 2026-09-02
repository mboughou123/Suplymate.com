import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Remote supplier/product photos are proxied and optimized through the
    // Next.js image optimizer (resized, converted to WebP/AVIF, cached on our
    // edge) instead of hotlinking third-party hosts directly.
    remotePatterns: [
      // Google Maps / Google Photos supplier imagery (lh3–lh6, etc.)
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "streetviewpixels-pa.googleapis.com" },
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
