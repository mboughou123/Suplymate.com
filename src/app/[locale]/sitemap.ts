import type { MetadataRoute } from "next";
import { getFallbackSupplierIds } from "@/lib/data-service";
import { locales } from "@/i18n/routing";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com"
).replace(/\/$/, "");

const STATIC_PATHS = [
  "",
  "/suppliers",
  "/products",
  "/price-charts",
  "/ai-assistant",
  "/pricing",
  "/about",
  "/contact",
  "/faq",
  "/help",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/cookies",
  "/supplier-verification-policy",
  "/review-policy",
  "/image-removal-policy",
  "/refund-and-protection-policy",
];

function localeUrl(locale: string, path: string): string {
  const suffix = path === "" ? "" : path;
  return `${SITE_URL}/${locale}${suffix}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: localeUrl(locale, path),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }))
  );

  const supplierRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    getFallbackSupplierIds().map((slug) => ({
      url: localeUrl(locale, `/supplier/${slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))
  );

  return [...staticRoutes, ...supplierRoutes];
}
