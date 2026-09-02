import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LISTER_B2_SUPPLIER_ID_BY_SLUG,
  listerBatch2Count,
  listerBatch2ForSupplier,
  listerBatch2Products,
} from "@/lib/lister-product-batch2";
import { hasSourcedPrice } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isRealImageUrl } from "@/lib/image-fallback";

describe("Lister product-media batch 2", () => {
  it("loads all 29 construction + industrial SKUs", () => {
    expect(listerBatch2Count()).toBe(29);
    expect(listerBatch2Products.filter((p) => p.category === "Construction")).toHaveLength(14);
    expect(listerBatch2Products.filter((p) => p.category === "Industrial Parts")).toHaveLength(15);
  });

  it("maps every supplier_slug_guess to a phase-1 supplier id", () => {
    for (const p of listerBatch2Products) {
      expect(Object.values(LISTER_B2_SUPPLIER_ID_BY_SLUG)).toContain(p.supplierId);
    }
  });

  it("keeps null unit_price as RFQ and never invents $0.00", () => {
    const rfq = listerBatch2Products.filter((p) => !hasSourcedPrice(p.basePrice));
    const priced = listerBatch2Products.filter((p) => hasSourcedPrice(p.basePrice));
    expect(rfq).toHaveLength(11);
    expect(priced).toHaveLength(18);
    for (const p of rfq) {
      expect(p.basePrice).toBeNull();
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
    }
    for (const p of priced) {
      expect(p.basePrice).toBeGreaterThan(0);
      expect(p.commissionRate).toBe(0);
    }
  });

  it("applies honesty badges (MRP / mill estimate / mill list / listed FOB / retail)", () => {
    const byName = (name: string) =>
      listerBatch2Products.find((p) => p.name === name);

    const opc = byName("UltraTech OPC 53 Grade Cement (50 kg bag)");
    expect(opc?.priceSourceType).toBe("printed_mrp");
    expect(priceSourceBadgeLabel(opc?.priceSourceType, true)).toBe("MRP");

    const panels = byName("Magicrete AAC Wall Panels (steel-reinforced)");
    expect(panels?.priceSourceType).toBe("mill_estimate");
    expect(priceSourceBadgeLabel(panels?.priceSourceType, true)).toBe("Mill estimate");

    const blox = byName("Magic Blox Eco Friendly AAC Blocks");
    expect(blox?.priceSourceType).toBe("mill_list");
    expect(priceSourceBadgeLabel(blox?.priceSourceType, true)).toBe("Mill list");

    const hangxiao = byName(
      "Durable Steel Structure Prefabricated Warehouse for Commercial Use"
    );
    expect(hangxiao?.priceSourceType).toBe("listed_fob");
    expect(priceSourceBadgeLabel(hangxiao?.priceSourceType, true)).toBe("Listed FOB");

    const kdi = byName("Monobloc Pump KDI-520++ 5 HP Three Phase 415 V");
    expect(kdi?.priceSourceType).toBe("retail_eshop");
    expect(priceSourceBadgeLabel(kdi?.priceSourceType, true)).toBe("Retail");

    const zamil = byName("Zamil Steel Pre-Engineered Building (PEB) System");
    expect(zamil?.basePrice).toBeNull();
    expect(priceSourceBadgeLabel(zamil?.priceSourceType, false)).toBeNull();
  });

  it("never captions MRP or retail as mill FOB", () => {
    for (const p of listerBatch2Products) {
      if (!hasSourcedPrice(p.basePrice)) continue;
      const badge = priceSourceBadgeLabel(p.priceSourceType, true);
      if (p.priceSourceType === "printed_mrp" || p.priceSourceType === "retail_eshop") {
        expect(badge?.toLowerCase()).not.toContain("fob");
        expect(badge?.toLowerCase()).not.toContain("mill");
      }
    }
  });

  it("prefers enhanced local JPGs over remote image_urls", () => {
    for (const p of listerBatch2Products) {
      expect(p.images.length).toBeGreaterThan(0);
      const primary = p.images[0];
      expect(primary.toLowerCase()).not.toContain(".pdf");
      expect(isRealImageUrl(primary), `${p.name} → ${primary}`).toBe(true);
      expect(primary.startsWith("/images/products/"), `${p.name} → ${primary}`).toBe(
        true
      );
      const abs = join(process.cwd(), "public", primary.replace(/^\//, ""));
      expect(existsSync(abs), primary).toBe(true);
    }
  });

  it("surfaces UltraTech / Kirloskar / Hangxiao under the right mills", () => {
    expect(listerBatch2ForSupplier("ultratech-cement-limited-in")).toHaveLength(3);
    expect(listerBatch2ForSupplier("kirloskar-brothers-limited-in")).toHaveLength(3);
    expect(
      listerBatch2ForSupplier("hangxiao-steel-structure-shandong-co-ltd-cn")
    ).toHaveLength(3);
  });
});
