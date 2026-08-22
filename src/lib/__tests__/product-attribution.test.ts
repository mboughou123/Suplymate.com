import { describe, expect, it } from "vitest";
import type { Product } from "@/data/products";
import { getProductCardData, getProductDetail } from "@/lib/product-detail";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";

// A product's supplier used to be chosen by hashing the product id and indexing
// into the directory, so a real listing was bylined and illustrated as an
// unrelated real company while the cart transacted with the correct one. Every
// product carries `supplierId`; these tests pin that it is what gets used.

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-product-1",
    name: "Seamless Steel Pipe",
    category: "Steel & Metals",
    priceMin: 100,
    priceMax: 0,
    currency: "USD",
    bestDeliveryDays: 14,
    supplierCount: 1,
    unit: "ton",
    ...overrides,
  };
}

describe("product supplier attribution", () => {
  const known = outscraperSuppliers.find((s) => s.name.trim().length > 0);

  it("uses the supplier on the product, not a hashed guess", () => {
    if (!known) return;
    const p = product({ supplierId: known.id, supplierName: known.name });
    expect(getProductDetail(p).supplier.id).toBe(known.id);
    expect(getProductDetail(p).supplier.name).toBe(known.name);
    expect(getProductCardData(p).supplierId).toBe(known.id);
  });

  it("attributes consistently no matter what the product id hashes to", () => {
    if (!known) return;
    for (const id of ["a", "zzz", "product-999", "seamless-steel-pipe-x"]) {
      const p = product({ id, supplierId: known.id, supplierName: known.name });
      expect(getProductDetail(p).supplier.id, `id "${id}"`).toBe(known.id);
    }
  });

  it("falls back to the product's own supplier fields, not another company", () => {
    const p = product({
      supplierId: "not-in-static-bundle",
      supplierName: "Some Real Company GmbH",
      supplierCountry: "Germany",
    });
    const detail = getProductDetail(p);
    expect(detail.supplier.id).toBe("not-in-static-bundle");
    expect(detail.supplier.name).toBe("Some Real Company GmbH");
    expect(detail.supplier.country).toBe("Germany");
  });

  it("never borrows a photo from a supplier that does not sell the product", () => {
    const withPhotos = outscraperSuppliers.find(
      (s) => s.imageUrl?.startsWith("http") || s.supplierImages?.some((u) => u.startsWith("http")),
    );
    if (!withPhotos) return;
    // An unresolvable supplier means we hold no photos for it, so a card must
    // fall back to a category tile rather than another company's premises.
    const card = getProductCardData(
      product({ supplierId: "unknown-supplier", supplierName: "Unknown Co" }),
    );
    expect(card.hasRealPhoto).toBe(false);
    expect(card.imageUrl).toBeFalsy();
  });
});
