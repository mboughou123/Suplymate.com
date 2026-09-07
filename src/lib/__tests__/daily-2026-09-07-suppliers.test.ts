import { existsSync, readdirSync } from "node:fs";
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

describe("daily 2026-09-07 full mill directory", () => {
  it("loads 50/50 mills with unique unused-slug ids", () => {
    expect(daily20260907Suppliers).toHaveLength(50);
    expect(new Set(daily20260907Suppliers.map((s) => s.id)).size).toBe(50);
    expect(DAILY_20260907_SLUGS).toHaveLength(50);
    for (const slug of DAILY_20260907_SLUGS) {
      expect(dailySupplierIdForSlug20260907(slug)).toBe(slug);
    }
    expect(daily20260907Suppliers.some((s) => s.id === "tubacex")).toBe(true);
    expect(daily20260907Suppliers.some((s) => s.id === "shougang")).toBe(true);
    expect(daily20260907Suppliers.some((s) => s.id === "stupp")).toBe(true);
    expect(daily20260907Suppliers.some((s) => s.id === "interpipe")).toBe(true);
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

  it("HOLD empty — full pack wired including Stupp + Interpipe (_01 only)", () => {
    const ids = new Set(daily20260907Suppliers.map((s) => s.id));
    expect(DAILY_20260907_HOLD_SLUGS).toHaveLength(0);
    expect([...DAILY_20260907_HOLD_SLUGS]).toEqual([]);
    expect(ids.has("shougang")).toBe(true);
    expect(ids.has("stupp")).toBe(true);
    expect(ids.has("interpipe")).toBe(true);

    const shougang = daily20260907Suppliers.find((s) => s.id === "shougang");
    expect(shougang?.category).toBe("Steel & Metals");
    expect(shougang?.supplierImages).toEqual(["/images/suppliers/shougang/shougang_01.jpg"]);

    const only01: Record<string, string> = {
      shougang: "shougang_01.jpg",
      stupp: "stupp_01.jpg",
      interpipe: "interpipe_01.jpg",
    };
    for (const [slug, file] of Object.entries(only01)) {
      const mill = daily20260907Suppliers.find((s) => s.id === slug);
      expect(mill?.supplierImages).toEqual([`/images/suppliers/${slug}/${file}`]);
      const dir = join(process.cwd(), "public", "images", "suppliers", slug);
      const siblings = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
      expect(siblings, slug).toEqual([file]);
      expect(existsSync(join(dir, file)), file).toBe(true);
    }
  });

  it("uses local factory stills for all 50 mills", () => {
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
    expect(ids.has("shougang")).toBe(true);
    expect(ids.has("stupp")).toBe(true);
    expect(ids.has("interpipe")).toBe(true);
  });
});
