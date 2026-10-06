// Server-only helpers that resolve PUBLISHED media for public pages, with safe
// fallbacks. These never return unpublished media. All functions degrade to an
// empty result on any error so public pages never break.

import { prisma } from "@/lib/prisma";
import { listMedia } from "@/lib/media-store";
import { listCertifications } from "@/lib/certifications-store";
import { decorateImageUrl, rankByAuthenticity, readImageAttribution } from "@/lib/image-attribution";

/** Published certificate image URLs for all of a supplier's certifications. */
export async function getSupplierCertificationImages(supplierId: string): Promise<string[]> {
  try {
    const certs = await listCertifications(supplierId);
    if (certs.length === 0) return [];
    const urls: string[] = [];
    for (const c of certs) {
      const media = await listMedia({ entityType: "CERTIFICATION", entityId: c.id, status: "published" });
      for (const m of media) urls.push(m.url);
    }
    return [...new Set(urls)];
  } catch {
    return [];
  }
}

/**
 * Batch-resolve the published PRIMARY/GALLERY image URLs for many products in a
 * single query. Returns a Map of productId -> ordered URLs (primary first).
 * Empty map on error so callers fall back to the legacy `images` field.
 */
export async function getPublishedProductImageMap(
  productIds: string[]
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (productIds.length === 0) return out;
  try {
    const rows = await prisma.media.findMany({
      where: {
        entityType: "PRODUCT",
        entityId: { in: productIds },
        status: "published",
        mediaType: { in: ["PRODUCT_PRIMARY", "PRODUCT_GALLERY"] },
      },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      select: { entityId: true, url: true, altText: true, caption: true, originalUrl: true },
    });
    const grouped = new Map<string, { url: string; aiGenerated: boolean }[]>();
    for (const r of rows) {
      if (!r.entityId || !r.url) continue;
      const attr = readImageAttribution(r);
      const arr = grouped.get(r.entityId) ?? [];
      arr.push({ url: decorateImageUrl(r.url, attr), aiGenerated: attr.aiGenerated });
      grouped.set(r.entityId, arr);
    }
    for (const [id, images] of grouped) {
      out.set(id, rankByAuthenticity(images).map((image) => image.url));
    }
  } catch {
    // no DB / no table — return empty so callers use legacy fields
  }
  return out;
}

/** Published image URLs for a single product (primary first). */
export async function getPublishedProductImageUrls(productId: string): Promise<string[]> {
  const map = await getPublishedProductImageMap([productId]);
  return map.get(productId) ?? [];
}
