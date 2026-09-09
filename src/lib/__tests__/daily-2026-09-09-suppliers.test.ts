import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAILY_20260909_HOLD_SLUGS,
  DAILY_20260909_SLUGS,
  daily20260909Suppliers,
  dailySupplierIdForSlug20260909,
} from "@/lib/daily-2026-09-09-suppliers";
import { daily20260908Suppliers } from "@/lib/daily-2026-09-08-suppliers";
import { collectFactoryPhotoUrls } from "@/lib/phase1";
import { getSupplierProfile } from "@/lib/supplier-profile";
import { getFallbackSupplierIds } from "@/lib/data-service";

const SEALED3 = ["pepperl-fuchs", "sew-eurodrive", "daido-steel"] as const;

const SOFT11 = [
  "toyo-seikan",
  "billerud",
  "greatview",
  "kaeser",
  "gea",
  "yokogawa",
  "wittenstein",
  "kobe-steel",
  "helukabel",
  "lapp",
  "james-hardie",
] as const;

describe("daily 2026-09-09 mill directory", () => {
  it("loads 14 mills with unique unused-slug ids", () => {
    expect(daily20260909Suppliers).toHaveLength(14);
    expect(new Set(daily20260909Suppliers.map((s) => s.id)).size).toBe(14);
    expect(DAILY_20260909_SLUGS).toHaveLength(14);
    expect(DAILY_20260909_HOLD_SLUGS).toHaveLength(36);
    for (const slug of DAILY_20260909_SLUGS) {
      expect(dailySupplierIdForSlug20260909(slug)).toBe(slug);
    }
    expect(daily20260909Suppliers.some((s) => s.id.startsWith("daily-20260909-"))).toBe(
      false,
    );
  });

  it("wires sealed 3 + soft 11 and keeps HOLD 36 absent", () => {
    const ids = new Set(daily20260909Suppliers.map((s) => s.id));
    for (const slug of SEALED3) {
      expect(ids.has(slug), slug).toBe(true);
    }
    for (const slug of SOFT11) {
      expect(ids.has(slug), slug).toBe(true);
    }
    for (const slug of DAILY_20260909_HOLD_SLUGS) {
      expect(ids.has(slug), slug).toBe(false);
      expect(ids.has(`daily-20260909-${slug}`), slug).toBe(false);
    }
  });

  it("uses sew-eurodrive_02 and wittenstein_02; others a single _01 still", () => {
    const expectedFile: Record<string, string> = {
      "sew-eurodrive": "sew-eurodrive_02.jpg",
      wittenstein: "wittenstein_02.jpg",
    };

    for (const mill of daily20260909Suppliers) {
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
  });

  it("has no remote http image URLs", () => {
    for (const mill of daily20260909Suppliers) {
      const photos = collectFactoryPhotoUrls(mill);
      expect(photos.length, mill.name).toBe(1);
      for (const url of photos) {
        expect(url.startsWith("/images/suppliers/")).toBe(true);
        expect(/^https?:\/\//i.test(url)).toBe(false);
        expect(/^https?:\/\//i.test(mill.imageUrl ?? "")).toBe(false);
      }
    }
  });

  it("keeps sew / wittenstein / HQ honesty notes on description text", () => {
    const text = (id: string) =>
      daily20260909Suppliers.find((s) => s.id === id)?.description ?? "";
    expect(text("sew-eurodrive").toLowerCase()).toMatch(/graben|sew-eurodrive_02/);
    expect(text("wittenstein").toLowerCase()).toMatch(/innovationsfabrik|wittenstein_02/);
    expect(text("toyo-seikan").toLowerCase()).toMatch(/office tower|hq/);
    expect(text("pepperl-fuchs").toLowerCase()).toMatch(/mannheim/);
  });

  it("maps Hardware & Motion → Industrial Parts", () => {
    const sew = daily20260909Suppliers.find((s) => s.id === "sew-eurodrive");
    expect(sew?.category).toBe("Industrial Parts");
    const wittenstein = daily20260909Suppliers.find((s) => s.id === "wittenstein");
    expect(wittenstein?.category).toBe("Industrial Parts");
  });

  it("does not invent ISO badges and keeps RFQ MOQ", () => {
    for (const mill of daily20260909Suppliers) {
      expect(mill.certificationsDetailed).toEqual([]);
      expect(mill.certificationImages).toEqual([]);
      expect(getSupplierProfile(mill).certifications).toEqual([]);
      expect(mill.moq.toLowerCase()).toMatch(/rfq|not published/);
      expect(mill.moq).not.toMatch(/\$\d/);
    }
  });

  it("leaves the 09-08 mill pack at 48", () => {
    expect(daily20260908Suppliers).toHaveLength(48);
  });

  it("is reachable from the public supplier fallback set", () => {
    const ids = new Set(getFallbackSupplierIds());
    expect(ids.has("pepperl-fuchs")).toBe(true);
    expect(ids.has("sew-eurodrive")).toBe(true);
    expect(ids.has("daido-steel")).toBe(true);
    expect(ids.has("wittenstein")).toBe(true);
    expect(ids.has("butting")).toBe(true);
    expect(ids.has("marcegaglia")).toBe(false);
    expect(ids.has("ternium")).toBe(false);
    for (const slug of DAILY_20260909_HOLD_SLUGS) {
      expect(ids.has(slug), slug).toBe(false);
    }
  });
});
