import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSupplierCsv } from "@/lib/csv";
import { importSuppliersFromCsv } from "@/lib/supplier-csv";

const PHASE1_CSV = resolve(
  process.cwd(),
  "scripts/import/phase1/suppliers-phase1-import.csv"
);

describe("CSV photoUrls → images alias", () => {
  it("recognizes photoUrls as the images list field", () => {
    const text = [
      "name,website,photoUrls",
      'Acme Tubes,https://example.com,/images/a.jpg|/images/b.jpg',
    ].join("\n");
    const parsed = parseSupplierCsv(text);
    expect(parsed.recognized).toContain("images");
    expect(parsed.rows[0].values.images).toBe(
      "/images/a.jpg|/images/b.jpg"
    );
  });

  it("maps photos alias the same way", () => {
    const text = "name,photos\nAcme,/img/1.jpg\n";
    const parsed = parseSupplierCsv(text);
    expect(parsed.recognized).toContain("images");
    expect(parsed.rows[0].values.images).toBe("/img/1.jpg");
  });

  it("imports phase-1 CSV with gallery images for Al Gharbia and AJ Steel", () => {
    const text = readFileSync(PHASE1_CSV, "utf8");
    const result = importSuppliersFromCsv(text);
    expect(result.recognized).toContain("images");
    expect(result.valid.length).toBe(59);
    expect(result.errors).toEqual([]);

    const alGharbia = result.valid.find((s) =>
      s.name.includes("Al Gharbia")
    );
    expect(alGharbia).toBeTruthy();
    expect(alGharbia!.images.length).toBeGreaterThanOrEqual(4);
    expect(alGharbia!.images[0]).toMatch(
      /^\/images\/suppliers\/phase1\/tube-pipes\//
    );
    expect(alGharbia!.imageUrl).toBe(alGharbia!.images[0]);

    const ajSteel = result.valid.find((s) => s.name.includes("AJ Steel"));
    expect(ajSteel).toBeTruthy();
    expect(ajSteel!.images).toEqual([
      "/images/suppliers/phase1/tube-pipes/aj-steel-1.jpg",
      "/images/suppliers/phase1/tube-pipes/aj-steel-2.jpg",
    ]);

    const tongMing = result.valid.find((s) => s.name.includes("Tong Ming"));
    expect(tongMing).toBeTruthy();
    expect(tongMing!.images[0]).toBe(
      "/images/suppliers/phase1/industrial-parts/tong-ming-1.jpg"
    );
    expect(tongMing!.images).toHaveLength(3);

    const withLocal = result.valid.filter((s) =>
      s.images.some((u) => u.startsWith("/images/suppliers/phase1/"))
    );
    // 58/59 local; Magicrete keeps only a tiny remote IndiaMART thumb.
    expect(withLocal.length).toBe(58);
    const magicrete = result.valid.find((s) => s.name.includes("Magicrete"));
    expect(magicrete?.images[0]).toMatch(/^https?:\/\//);
  });
});
