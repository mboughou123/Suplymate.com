import { describe, expect, it, vi } from "vitest";

// No database: every Prisma call throws, so the catalogue must be served from
// the in-memory path (curated pack products + legacy static catalogue).
vi.mock("@/lib/prisma", () => ({
  prisma: {
    scrapedProduct: {
      count: async () => {
        throw new Error("no database");
      },
      findMany: async () => {
        throw new Error("no database");
      },
    },
    supplier: {
      findMany: async () => {
        throw new Error("no database");
      },
    },
    media: {
      findMany: async () => {
        throw new Error("no database");
      },
    },
  },
}));

import { getPublicProductsPage } from "@/lib/public-products";
import { packProducts } from "@/data/pack-catalog";

describe("public catalogue (no-DB memory path)", () => {
  it("serves the curated pack products with their local photos", async () => {
    const page = await getPublicProductsPage({ page: 1, pageSize: 60 });
    const packIds = new Set(packProducts.map((p) => p.id));
    const packCards = page.items.filter((c) => packIds.has(c.id));
    expect(packCards.length).toBeGreaterThan(0);
    for (const card of packCards.filter((c) => c.hasRealPhoto)) {
      expect(card.imageUrl).toMatch(/^\/images\//);
    }
  });

  it("never renders an RFQ-only listing as $0.00", async () => {
    const rfq = packProducts.find((p) => p.basePrice == null);
    expect(rfq).toBeDefined();
    const page = await getPublicProductsPage({ page: 1, pageSize: 500, supplierId: rfq!.supplierId });
    const card = page.items.find((c) => c.id === rfq!.id);
    expect(card).toBeDefined();
    expect(card!.priceLabel).toBeNull();
  });

  it("hasPrice filter drops RFQ-only listings", async () => {
    const page = await getPublicProductsPage({ page: 1, pageSize: 500, hasPrice: true });
    expect(page.items.every((c) => c.priceLabel && !/\$0\.00/.test(c.priceLabel))).toBe(true);
  });
});
