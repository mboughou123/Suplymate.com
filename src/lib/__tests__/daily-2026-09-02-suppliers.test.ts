import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DUCAB_EXISTING_ID,
  daily20260902Suppliers,
} from "@/lib/daily-2026-09-02-suppliers";
import { collectFactoryPhotoUrls } from "@/lib/phase1";
import { getSupplierProfile } from "@/lib/supplier-profile";
import { getFallbackSupplierIds } from "@/lib/data-service";

describe("daily 2026-09-02 mill directory", () => {
  it("loads 50 mills and overlays Ducab onto the existing directory row", () => {
    expect(daily20260902Suppliers).toHaveLength(50);
    expect(new Set(daily20260902Suppliers.map((s) => s.id)).size).toBe(50);
    expect(daily20260902Suppliers.some((s) => s.id === DUCAB_EXISTING_ID)).toBe(
      true,
    );
    expect(daily20260902Suppliers.some((s) => s.id === "ducab")).toBe(false);
  });

  it("uses local factory stills for all 50 mills", () => {
    expect(daily20260902Suppliers.every((s) => (s.supplierImages?.length ?? 0) > 0)).toBe(
      true,
    );
    for (const slug of ["sail", "hyundai-steel", "prysmian", "skf", "crh", "ball"]) {
      const mill = daily20260902Suppliers.find((s) => s.id === slug);
      expect(mill?.supplierImages?.length, slug).toBe(3);
    }

    for (const mill of daily20260902Suppliers) {
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
    for (const mill of daily20260902Suppliers) {
      expect(mill.certificationsDetailed).toEqual([]);
      expect(mill.certificationImages).toEqual([]);
      expect(getSupplierProfile(mill).certifications).toEqual([]);
    }
  });

  it("keeps unpublished MOQ as RFQ wording and never invents a unit price", () => {
    for (const mill of daily20260902Suppliers) {
      expect(mill.moq.toLowerCase()).toMatch(/rfq|not published/);
      expect(mill.moq).not.toMatch(/\$\d/);
    }
  });

  it("is reachable from the public supplier fallback set", () => {
    const ids = new Set(getFallbackSupplierIds());
    expect(ids.has("nucor")).toBe(true);
    expect(ids.has("arcelormittal")).toBe(true);
    expect(ids.has(DUCAB_EXISTING_ID)).toBe(true);
    expect(ids.has("skf")).toBe(true);
  });
});
