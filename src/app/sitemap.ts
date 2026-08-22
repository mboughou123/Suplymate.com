import type { MetadataRoute } from "next";
import { getProductsFromDb, getSuppliersFromDb } from "@/lib/data-service";
import { isRealProductName } from "@/lib/product-quality";
import { defaultLocale } from "@/i18n/routing";

// Served at /sitemap.xml (the location crawlers probe and robots.txt points
// at). It previously lived under app/[locale], which published it to
// /en/sitemap.xml where nothing referenced it and no crawler would look.

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
  "/for-suppliers",
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const prefix = `${SITE_URL}/${defaultLocale}`;

  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${prefix}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  // Supplier URLs come from the database, which is what the profile pages
  // actually resolve against and which already applies the public-visibility
  // gate. The previous static bundle had drifted: it omitted 9 real suppliers
  // and advertised ~99 entries with no database row behind them.
  //
  // On failure the supplier section is omitted entirely rather than falling
  // back to that bundle — an incomplete sitemap is harmless, whereas
  // submitting URLs for businesses that do not exist is not.
  let supplierRoutes: MetadataRoute.Sitemap = [];
  try {
    const suppliers = await getSuppliersFromDb();
    supplierRoutes = suppliers.map((supplier) => ({
      url: `${prefix}/supplier/${supplier.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    supplierRoutes = [];
  }

  // Product URLs were omitted entirely: the sitemap listed suppliers and
  // static pages only, so the 158 approved catalogue products were invisible
  // to crawlers. Same rule as the supplier section — DB only, no static
  // fallback, and navigation-label scrapes are excluded.
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getProductsFromDb();
    productRoutes = products
      .filter((product) => isRealProductName(product.name))
      .map((product) => ({
        url: `${prefix}/products/${product.id}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    productRoutes = [];
  }

  return [...staticRoutes, ...supplierRoutes, ...productRoutes];
}
