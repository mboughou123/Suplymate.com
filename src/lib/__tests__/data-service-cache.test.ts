import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Enough rows to pass the "DB has been imported" threshold in loadSuppliers.
const ROW_COUNT = 60;
let supplierQueries = 0;
let productQueries = 0;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplier: {
      findMany: async () => {
        supplierQueries += 1;
        return Array.from({ length: ROW_COUNT }, (_, i) => ({
          id: `sup-${i}`,
          name: `Supplier ${String(i).padStart(3, "0")}`,
          industry: "Metal",
          location: "Rotterdam, Netherlands",
          products: JSON.stringify(["steel"]),
          deliveryRegions: JSON.stringify(["EU"]),
          moq: "1 t",
          reliabilityScore: 80,
          score: 80,
        }));
      },
      findUnique: async () => null,
    },
    product: {
      findMany: async () => {
        productQueries += 1;
        return [];
      },
    },
  },
}));

vi.mock("@/lib/scraped-products-store", () => ({
  listApprovedScrapedProducts: async () => [],
  scrapedToProduct: (p: unknown) => p,
}));

import {
  getProductsFromDb,
  getSuppliersFromDb,
  invalidateCatalogCache,
} from "@/lib/data-service";

describe("data-service catalogue cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invalidateCatalogCache();
    supplierQueries = 0;
    productQueries = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves repeated supplier reads from one query within the TTL", async () => {
    const [a, b] = await Promise.all([getSuppliersFromDb(), getSuppliersFromDb()]);
    await getSuppliersFromDb();
    expect(supplierQueries).toBe(1);
    expect(a).toHaveLength(ROW_COUNT);
    expect(a).toEqual(b);
  });

  it("hands out a fresh array so callers sorting in place cannot corrupt the cache", async () => {
    const first = await getSuppliersFromDb();
    const original = first.map((s) => s.id);
    first.reverse();
    const second = await getSuppliersFromDb();
    expect(second.map((s) => s.id)).toEqual(original);
    expect(second).not.toBe(first);
  });

  it("re-queries once the TTL has elapsed", async () => {
    await getSuppliersFromDb();
    vi.advanceTimersByTime(60_001);
    await getSuppliersFromDb();
    expect(supplierQueries).toBe(2);
  });

  it("caches the public product catalogue too", async () => {
    await getProductsFromDb();
    await getProductsFromDb();
    expect(productQueries).toBe(1);
    invalidateCatalogCache();
    await getProductsFromDb();
    expect(productQueries).toBe(2);
  });
});
