import { describe, expect, it, vi } from "vitest";
import { sampleScrapedProducts } from "@/data/scraped-products";

// Live /en/products bug: Prisma has a leftover approved scrape (~6 rows).
// fromDb treated any non-zero count as the full catalogue and never merged
// pack-catalog RFQ SKUs (the path /en/suppliers already uses for mills).
const tinyRows = sampleScrapedProducts.slice(0, 6).map((p, i) => ({
  id: p.id,
  supplierId: p.supplierId,
  supplierName: p.supplierName,
  supplierLogo: p.supplierLogo ?? null,
  supplierCountry: p.supplierCountry ?? null,
  name: p.name,
  slug: p.slug ?? null,
  category: p.category,
  images: JSON.stringify(p.images),
  videos: JSON.stringify(p.videos),
  basePrice: p.basePrice ?? null,
  priceUnit: p.priceUnit ?? null,
  commissionRate: p.commissionRate ?? null,
  currency: p.currency,
  moq: p.moq ?? null,
  minimumOrderUnit: p.minimumOrderUnit ?? null,
  shippingTime: p.shippingTime ?? null,
  description: p.description ?? null,
  shortDescription: p.shortDescription ?? null,
  specifications: JSON.stringify(p.specifications),
  customizationOptions: JSON.stringify(p.customizationOptions),
  certifications: JSON.stringify(p.certifications),
  rating: p.rating ?? null,
  reviewCount: p.reviewCount ?? null,
  sourceUrl: p.sourceUrl,
  productUrl: p.productUrl ?? null,
  imageSourceUrl: p.imageSourceUrl ?? null,
  sku: p.sku ?? null,
  verifiedSupplier: p.verifiedSupplier,
  status: "approved",
  scrapedAt: new Date(p.scrapedAt),
  updatedAt: new Date(2026, 0, i + 1),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scrapedProduct: {
      count: async (args?: { where?: { id?: { in?: string[] } } }) => {
        const ids = args?.where?.id?.in;
        if (ids) return tinyRows.filter((r) => ids.includes(r.id)).length;
        return tinyRows.length;
      },
      findMany: async () => tinyRows,
    },
    supplier: {
      findMany: async () => [],
    },
    media: {
      findMany: async () => [],
    },
  },
}));

import { getPublicProductsPage } from "@/lib/public-products";
import { packProducts } from "@/data/pack-catalog";

const SOFT_914 = [
  "allied-tube-conduit",
  "pregis",
  "gibson-stainless",
  "nord-lock",
  "worthington-enterprises",
] as const;

describe("public catalogue (tiny leftover scraped DB)", () => {
  it("serves pack-catalog RFQ SKUs instead of only the ~6 scraped rows", async () => {
    const page = await getPublicProductsPage({ page: 1, pageSize: 60 });
    const packIds = new Set(packProducts.map((p) => p.id));
    const packOnPage = page.items.filter((c) => packIds.has(c.id));

    expect(page.total).toBeGreaterThan(200);
    expect(packOnPage.length).toBeGreaterThan(0);
    expect(tinyRows.every((r) => page.total > tinyRows.length)).toBe(true);
  });

  it("includes 9/14 soft RFQ SKUs with local /images/products stills and no unit price", async () => {
    for (const slug of SOFT_914) {
      const sku = packProducts.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.basePrice, slug).toBeNull();
      const page = await getPublicProductsPage({
        page: 1,
        pageSize: 60,
        supplierId: sku!.supplierId,
      });
      const card = page.items.find((c) => c.id === sku!.id);
      expect(card, slug).toBeDefined();
      expect(card!.priceLabel, slug).toBeNull();
      expect(card!.imageUrl, slug).toMatch(/^\/images\/products\//);
    }
  });
});
