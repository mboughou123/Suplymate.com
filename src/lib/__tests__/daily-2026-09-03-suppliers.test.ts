import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAILY_20260903_SLUGS,
  daily20260903Suppliers,
  dailySupplierIdForSlug20260903,
} from "@/lib/daily-2026-09-03-suppliers";
import { collectFactoryPhotoUrls } from "@/lib/phase1";
import { getSupplierProfile } from "@/lib/supplier-profile";
import { getFallbackSupplierIds } from "@/lib/data-service";

describe("daily 2026-09-03 morning mill directory", () => {
  it("loads 50 mills with unique ids that prefer unused slugs", () => {
    expect(daily20260903Suppliers).toHaveLength(50);
    expect(new Set(daily20260903Suppliers.map((s) => s.id)).size).toBe(50);
    expect(DAILY_20260903_SLUGS).toHaveLength(50);
    for (const slug of DAILY_20260903_SLUGS) {
      expect(dailySupplierIdForSlug20260903(slug)).toBe(slug);
    }
    expect(daily20260903Suppliers.some((s) => s.id === "tmk")).toBe(true);
    expect(daily20260903Suppliers.some((s) => s.id.startsWith("daily-20260903-"))).toBe(
      false,
    );
  });

  it("uses local factory stills for all 50 mills", () => {
    expect(daily20260903Suppliers.every((s) => (s.supplierImages?.length ?? 0) > 0)).toBe(
      true,
    );

    for (const mill of daily20260903Suppliers) {
      const photos = collectFactoryPhotoUrls(mill);
      expect(photos.length, mill.name).toBeGreaterThan(0);
      for (const url of photos) {
        expect(url.startsWith("/images/suppliers/")).toBe(true);
        expect(/^https?:\/\//i.test(url)).toBe(false);
        const abs = join(process.cwd(), "public", url.replace(/^\//, ""));
        expect(existsSync(abs), url).toBe(true);
      }
    }
  });

  it("does not invent ISO badges from research-note certifications", () => {
    for (const mill of daily20260903Suppliers) {
      expect(mill.certificationsDetailed).toEqual([]);
      expect(mill.certificationImages).toEqual([]);
      expect(getSupplierProfile(mill).certifications).toEqual([]);
    }
  });

  it("keeps unpublished MOQ as RFQ wording and never invents a unit price", () => {
    for (const mill of daily20260903Suppliers) {
      expect(mill.moq.toLowerCase()).toMatch(/rfq|not published/);
      expect(mill.moq).not.toMatch(/\$\d/);
    }
  });

  it("maps Hardware & Motion onto Industrial Parts", () => {
    const motion = daily20260903Suppliers.filter((s) =>
      ["thk", "hiwin", "igus", "contitech", "habasit", "bossard"].includes(s.id),
    );
    expect(motion).toHaveLength(6);
    expect(motion.every((s) => s.category === "Industrial Parts")).toBe(true);
  });

  it("notes Bossard soft-hold distributor identity and Maharashtra yard inventory", () => {
    const bossard = daily20260903Suppliers.find((s) => s.id === "bossard");
    expect(bossard?.description?.toLowerCase()).toMatch(/soft-hold/);
    expect(bossard?.description?.toLowerCase()).toMatch(/distributor\/logistics/);
    expect(bossard?.verified).toBe(true);

    const msl = daily20260903Suppliers.find((s) => s.id === "maharashtra-seamless");
    expect(msl?.description?.toLowerCase()).toMatch(/yard inventory/);
    expect(msl?.description?.toLowerCase()).toMatch(/not mill gate/);
  });

  it("is reachable from the public supplier fallback set", () => {
    const ids = new Set(getFallbackSupplierIds());
    expect(ids.has("tmk")).toBe(true);
    expect(ids.has("bossard")).toBe(true);
    expect(ids.has("maharashtra-seamless")).toBe(true);
    expect(ids.has("china-baowu")).toBe(true);
    expect(ids.has("kirby-building-systems")).toBe(true);
  });
});
