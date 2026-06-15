import type { MetadataRoute } from "next";
import { getFallbackSupplierIds } from "@/lib/data-service";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com"
).replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/suppliers",
    "/ai-assistant",
    "/dashboard",
    "/login",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const supplierRoutes: MetadataRoute.Sitemap = getFallbackSupplierIds().map(
    (slug) => ({
      url: `${SITE_URL}/supplier/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  );

  return [...staticRoutes, ...supplierRoutes];
}
