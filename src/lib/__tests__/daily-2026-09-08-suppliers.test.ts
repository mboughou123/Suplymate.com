import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAILY_20260908_HOLD_SLUGS,
  DAILY_20260908_SLUGS,
  daily20260908Suppliers,
  dailySupplierIdForSlug20260908,
} from "@/lib/daily-2026-09-08-suppliers";
import { collectFactoryPhotoUrls } from "@/lib/phase1";
import { getSupplierProfile } from "@/lib/supplier-profile";
import { getFallbackSupplierIds } from "@/lib/data-service";

const SEALED7 = [
  "butting",
  "dura-bond",
  "chelpipe",
  "verallia",
  "oriental-motor",
  "algoma",
  "knauf",
] as const;

const SOFT17 = [
  "schneider-electric",
  "siemens",
  "rockwell-automation",
  "honeywell",
  "spirax-sarco",
  "komatsu",
  "caterpillar",
  "acerinox",
  "putzmeister",
  "liebherr",
  "rotork",
  "hitachi-cm",
  "carpenter",
  "nlmk",
  "sumitomo-electric",
  "owens-corning",
  "aperam",
] as const;

describe("daily 2026-09-08 partial mill directory", () => {
  it("loads 24 mills with unique unused-slug ids", () => {
    expect(daily20260908Suppliers).toHaveLength(24);
    expect(new Set(daily20260908Suppliers.map((s) => s.id)).size).toBe(24);
    expect(DAILY_20260908_SLUGS).toHaveLength(24);
    expect(DAILY_20260908_HOLD_SLUGS).toHaveLength(26);
    for (const slug of DAILY_20260908_SLUGS) {
      expect(dailySupplierIdForSlug20260908(slug)).toBe(slug);
    }
    expect(daily20260908Suppliers.some((s) => s.id.startsWith("daily-20260908-"))).toBe(
      false,
    );
  });

  it("wires each sealed+soft slug and keeps every HOLD slug absent", () => {
    const ids = new Set(daily20260908Suppliers.map((s) => s.id));
    for (const slug of SEALED7) {
      expect(ids.has(slug), slug).toBe(true);
    }
    for (const slug of SOFT17) {
      expect(ids.has(slug), slug).toBe(true);
    }
    for (const slug of DAILY_20260908_HOLD_SLUGS) {
      expect(ids.has(slug), slug).toBe(false);
      expect(ids.has(`daily-20260908-${slug}`), `prefixed ${slug}`).toBe(false);
    }
  });

  it("does not add HOLD public image directories from this pack", () => {
    const root = join(process.cwd(), "public", "images", "suppliers");
    for (const slug of DAILY_20260908_HOLD_SLUGS) {
      expect(existsSync(join(root, slug)), slug).toBe(false);
    }
  });

  it("uses exactly one on-disk still per mill (chelpipe_02 / nlmk_02 / hitachi-cm_04)", () => {
    const expectedFile: Record<string, string> = {
      chelpipe: "chelpipe_02.jpg",
      nlmk: "nlmk_02.jpg",
      "hitachi-cm": "hitachi-cm_04.jpg",
    };

    for (const mill of daily20260908Suppliers) {
      expect(mill.supplierImages, mill.id).toHaveLength(1);
      const url = mill.supplierImages![0];
      expect(url.startsWith(`/images/suppliers/${mill.id}/`)).toBe(true);
      expect(url.endsWith(".jpg")).toBe(true);
      const abs = join(process.cwd(), "public", url.replace(/^\//, ""));
      expect(existsSync(abs), url).toBe(true);

      const dir = join(process.cwd(), "public", "images", "suppliers", mill.id);
      const siblings = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
      expect(siblings, mill.id).toHaveLength(1);

      const file = expectedFile[mill.id] ?? `${mill.id}_01.jpg`;
      expect(url.endsWith(file), `${mill.id} → ${file}`).toBe(true);
      expect(siblings).toEqual([file]);
    }

    const chelpipe = daily20260908Suppliers.find((s) => s.id === "chelpipe");
    expect(chelpipe?.supplierImages?.[0].endsWith("chelpipe_02.jpg")).toBe(true);
    const nlmk = daily20260908Suppliers.find((s) => s.id === "nlmk");
    expect(nlmk?.supplierImages?.[0].endsWith("nlmk_02.jpg")).toBe(true);
    const hitachi = daily20260908Suppliers.find((s) => s.id === "hitachi-cm");
    expect(hitachi?.supplierImages?.[0].endsWith("hitachi-cm_04.jpg")).toBe(true);
  });

  it("has no remote http image URLs", () => {
    for (const mill of daily20260908Suppliers) {
      const photos = collectFactoryPhotoUrls(mill);
      expect(photos.length, mill.name).toBe(1);
      for (const url of photos) {
        expect(url.startsWith("/images/suppliers/")).toBe(true);
        expect(/^https?:\/\//i.test(url)).toBe(false);
        expect(/^https?:\/\//i.test(mill.imageUrl ?? "")).toBe(false);
      }
    }
  });

  it("maps Hardware & Motion → Industrial Parts and Tube & Pipes → Tubes & Pipes", () => {
    const oriental = daily20260908Suppliers.find((s) => s.id === "oriental-motor");
    expect(oriental?.category).toBe("Industrial Parts");
    const butting = daily20260908Suppliers.find((s) => s.id === "butting");
    expect(butting?.category).toBe("Tubes & Pipes");
    const chelpipe = daily20260908Suppliers.find((s) => s.id === "chelpipe");
    expect(chelpipe?.category).toBe("Tubes & Pipes");
    const dura = daily20260908Suppliers.find((s) => s.id === "dura-bond");
    expect(dura?.category).toBe("Tubes & Pipes");
  });

  it("does not invent ISO badges and keeps RFQ MOQ", () => {
    for (const mill of daily20260908Suppliers) {
      expect(mill.certificationsDetailed).toEqual([]);
      expect(mill.certificationImages).toEqual([]);
      expect(getSupplierProfile(mill).certifications).toEqual([]);
      expect(mill.moq.toLowerCase()).toMatch(/rfq|not published/);
      expect(mill.moq).not.toMatch(/\$\d/);
    }
  });

  it("adds no 09-08 product pack", () => {
    expect(existsSync(join(process.cwd(), "data", "daily-2026-09-08-products.json"))).toBe(
      false,
    );
    expect(
      existsSync(join(process.cwd(), "src", "lib", "lister-product-daily-2026-09-08.ts")),
    ).toBe(false);
    expect(
      existsSync(join(process.cwd(), "src", "lib", "daily-2026-09-08-products.ts")),
    ).toBe(false);
  });

  it("is reachable from the public supplier fallback set (09-07 still present)", () => {
    const ids = new Set(getFallbackSupplierIds());
    expect(ids.has("butting")).toBe(true);
    expect(ids.has("chelpipe")).toBe(true);
    expect(ids.has("nlmk")).toBe(true);
    expect(ids.has("hitachi-cm")).toBe(true);
    expect(ids.has("siemens")).toBe(true);
    expect(ids.has("tubacex")).toBe(true);
    expect(ids.has("stupp")).toBe(true);
    expect(ids.has("interpipe")).toBe(true);
    for (const slug of DAILY_20260908_HOLD_SLUGS) {
      expect(ids.has(slug), slug).toBe(false);
    }
  });
});
