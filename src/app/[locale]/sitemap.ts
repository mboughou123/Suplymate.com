import type { MetadataRoute } from "next";
import { getFallbackSupplierIds } from "@/lib/data-service";
import { locales } from "@/i18n/routing";
import { BLOG_POSTS } from "@/data/blog";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com"
).replace(/\/$/, "");

const STATIC_PATHS = [
  "",
  "/suppliers",
  "/products",
  "/materials",
  "/ai-assistant",
  "/pricing",
  "/blog",
  "/about",
  "/careers",
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

  const blogRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    BLOG_POSTS.map((post) => ({
      url: localeUrl(locale, `/blog/${post.slug}`),
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  return [...staticRoutes, ...supplierRoutes, ...blogRoutes];
}
