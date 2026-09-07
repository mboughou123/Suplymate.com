import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAILY_20260907_HOLD_SLUGS,
  DAILY_20260907_SLUGS,
  daily20260907Suppliers,
  dailySupplierIdForSlug20260907,
} from "@/lib/daily-2026-09-07-suppliers";
import { collectFactoryPhotoUrls } from "@/lib/phase1";
import { getSupplierProfile } from "@/lib/supplier-profile";
import { getFallbackSupplierIds } from "@/lib/data-service";

const CLEARED_HOLD19 = [
  "berg-pipe",
  "saudi-steel-pipe",
  "alleima",
  "webco",
  "corinth-pipeworks",
  "tpco",
  "encore-wire",
  "nkt",
  "pca",
  "flsmidth",
  "wartsila",
  "abb",
  "severstal",
  "mueller-industries",
  "american-spiralweld",
  "aptar",
] as const;

describe("daily 2026-09-07 partial mill directory", () => {
  it("loads 47 sealed+soft+HOLD19 OK/SOFT mills with unique unused-slug ids", () => {
    expect(daily20260907Suppliers).toHaveLength(47);
    expect(new Set(daily20260907Suppliers.map((s) => s.id)).size).toBe(47);
    expect(DAILY_20260907_SLUGS).toHaveLength(47);
    for (const slug of DAILY_20260907_SLUGS) {
      expect(dailySupplierIdForSlug20260907(slug)).toBe(slug);
    }
    expect(daily20260907Suppliers.some((s) => s.id === "tubacex")).toBe(true);
    expect(daily20260907Suppliers.some((s) => s.id.startsWith("daily-20260907-"))).toBe(
      false,
    );
  });

  it("includes the 16 Researcher-cleared HOLD19 OK+SOFT mills", () => {
    const ids = new Set(daily20260907Suppliers.map((s) => s.id));
    expect(CLEARED_HOLD19).toHaveLength(16);
    for (const slug of CLEARED_HOLD19) {
      expect(ids.has(slug), slug).toBe(true);
      expect(
        existsSync(join(process.cwd(), "public", "images", "suppliers", slug)),
        slug,
      ).toBe(true);
    }
    expect(ids.has("berg-pipe")).toBe(true);
    expect(ids.has("aptar")).toBe(true);
  });

  it("omits remaining HOLD/blocked (shougang, stupp, interpipe)", () => {
    const ids = new Set(daily20260907Suppliers.map((s) => s.id));
    expect(DAILY_20260907_HOLD_SLUGS).toHaveLength(3);
    for (const slug of DAILY_20260907_HOLD_SLUGS) {
      expect(ids.has(slug), slug).toBe(false);
      expect(
        existsSync(join(process.cwd(), "public", "images", "suppliers", slug)),
        slug,
      ).toBe(false);
    }
    expect(ids.has("shougang")).toBe(false);
    expect(ids.has("stupp")).toBe(false);
    expect(ids.has("interpipe")).toBe(false);
  });

  it("uses local factory stills for all 47 mills", () => {
    expect(daily20260907Suppliers.every((s) => (s.supplierImages?.length ?? 0) > 0)).toBe(
      true,
    );

    for (const mill of daily20260907Suppliers) {
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

  it("keeps jfe-steel in Steel & Metals and maps Hardware & Motion to Industrial Parts", () => {
    const jfe = daily20260907Suppliers.find((s) => s.id === "jfe-steel");
    expect(jfe?.category).toBe("Steel & Metals");

    const motion = daily20260907Suppliers.filter((s) =>
      [
        "sick",
        "phoenix-contact",
        "nachi",
        "minebeamitsumi",
        "omron",
        "nabtesco",
      ].includes(s.id),
    );
    expect(motion).toHaveLength(6);
    expect(motion.every((s) => s.category === "Industrial Parts")).toBe(true);
  });

  it("does not invent ISO badges from research-note certifications", () => {
    for (const mill of daily20260907Suppliers) {
      expect(mill.certificationsDetailed).toEqual([]);
      expect(mill.certificationImages).toEqual([]);
      expect(getSupplierProfile(mill).certifications).toEqual([]);
    }
  });

  it("keeps unpublished MOQ as RFQ wording and never invents a unit price", () => {
    for (const mill of daily20260907Suppliers) {
      expect(mill.moq.toLowerCase()).toMatch(/rfq|not published/);
      expect(mill.moq).not.toMatch(/\$\d/);
    }
  });

  it("is reachable from the public supplier fallback set", () => {
    const ids = new Set(getFallbackSupplierIds());
    expect(ids.has("tubacex")).toBe(true);
    expect(ids.has("jfe-steel")).toBe(true);
    expect(ids.has("nachi")).toBe(true);
    expect(ids.has("saint-gobain")).toBe(true);
    expect(ids.has("berg-pipe")).toBe(true);
    expect(ids.has("aptar")).toBe(true);
    expect(ids.has("shougang")).toBe(false);
    expect(ids.has("stupp")).toBe(false);
    expect(ids.has("interpipe")).toBe(false);
  });
});
