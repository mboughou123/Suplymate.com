import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  packCertifications,
  packProducts,
  packStats,
  packSuppliers,
  mergePackSuppliers,
  overlayPackSupplier,
  getPackSupplier,
} from "@/data/pack-catalog";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";
import type { Supplier } from "@/data/suppliers";
import { pickHomeProducts, homeProductCategories, homeCategoryKey } from "@/lib/home-products";
import { scrapedToProduct } from "@/lib/scraped-products-store";
// The generator is plain ESM so the same magic-byte validator can be reused here.
import { isRealImageFile, buildCatalog } from "../../../scripts/build-catalog-from-packs.mjs";

const ROOT = process.cwd();
const PUBLIC = resolve(ROOT, "public");

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(co|company|ltd|limited|llc|pvt|private|inc|group|corp|corporation|plc|gmbh|sa|ag|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function allImagePaths(): string[] {
  const paths = new Set<string>();
  for (const s of packSuppliers) {
    if (s.logoUrl) paths.add(s.logoUrl);
    if (s.imageUrl) paths.add(s.imageUrl);
    for (const u of s.supplierImages ?? []) paths.add(u);
    for (const u of s.certificationImages ?? []) paths.add(u);
    for (const c of s.certificationsDetailed ?? []) if (c.imageUrl) paths.add(c.imageUrl);
  }
  for (const c of packCertifications) paths.add(c.imageUrl);
  for (const p of packProducts) for (const u of p.images) paths.add(u);
  return [...paths];
}

describe("generated pack catalogue", () => {
  it("is present and non-trivial", () => {
    expect(packSuppliers.length).toBeGreaterThan(100);
    expect(packProducts.length).toBeGreaterThan(200);
    expect(packCertifications.length).toBeGreaterThan(50);
    expect(packStats.suppliersWithPhotos).toBeGreaterThan(100);
  });

  it("references only local /images paths that exist on disk and are real raster images", () => {
    const paths = allImagePaths();
    expect(paths.length).toBeGreaterThan(1000);
    const bad = paths.filter((u) => {
      if (!u.startsWith("/images/")) return true;
      const abs = resolve(PUBLIC, decodeURI(u).replace(/^\//, ""));
      return !existsSync(abs) || !isRealImageFile(abs);
    });
    expect(bad).toEqual([]);
  });

  it("is up to date with the generator (run `npm run catalog:build`)", () => {
    const committed = readFileSync(resolve(ROOT, "src/data/generated/pack-catalog.json"), "utf8");
    const { catalog } = buildCatalog() as { catalog: unknown };
    expect(JSON.stringify(catalog, null, 2) + "\n").toBe(committed);
  });
});

describe("supplier de-duplication", () => {
  it("has unique supplier ids and unique normalised names inside the pack", () => {
    const ids = packSuppliers.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = packSuppliers.map((s) => normalizeName(s.name));
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes).toEqual([]);
  });

  it("flags suppliers already in the Outscraper directory as overlays instead of new cards", () => {
    const directoryIds = new Set(outscraperSuppliers.map((s) => s.id));
    for (const s of packSuppliers) {
      expect(s.overlaysExisting, s.id).toBe(directoryIds.has(s.id));
    }
    expect(packSuppliers.filter((s) => s.overlaysExisting).length).toBe(
      packStats.suppliersOverlayingDirectory
    );
  });

  it("merges into an existing list without duplicating ids", () => {
    const merged = mergePackSuppliers(outscraperSuppliers);
    const ids = merged.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const packOnly = packSuppliers.filter((s) => !s.overlaysExisting).length;
    expect(merged.length).toBe(outscraperSuppliers.length + packOnly);
  });

  it("overlays local media onto a directory row while keeping its contact data", () => {
    const pack = packSuppliers.find((s) => s.overlaysExisting && (s.supplierImages?.length ?? 0) > 0);
    expect(pack).toBeDefined();
    const row = outscraperSuppliers.find((s) => s.id === pack!.id)!;
    const merged = overlayPackSupplier({ ...row, phone: "+000", supplierImages: ["https://x/y.jpg"] }, pack!);
    expect(merged.phone).toBe("+000");
    expect(merged.supplierImages?.[0]).toMatch(/^\/images\//);
    expect(merged.supplierImages).toContain("https://x/y.jpg");
  });
});

describe("QA holds", () => {
  it("lists Bossard as a distributor without the verified badge", () => {
    const bossard = packSuppliers.find((s) => s.packSlug === "bossard");
    expect(bossard).toBeDefined();
    expect(bossard!.verified).toBe(false);
    expect(bossard!.businessType).toBe("Distributor");
    expect(bossard!.description).toMatch(/distributor/i);
    expect(packStats.distributors).toContain("bossard");
    // Even a directory row that claimed `verified: true` cannot re-verify it.
    const fake: Supplier = { ...bossard!, verified: true };
    expect(overlayPackSupplier(fake, bossard!).verified).toBe(false);
  });

  it("treats the cleared Jiuli and Ball holds as approved products with photos", () => {
    const jiuli = packProducts.filter((p) => p.packSlug === "jiuli");
    const ball = packProducts.filter((p) => p.packSlug === "ball");
    expect(jiuli.length).toBeGreaterThan(0);
    expect(ball.length).toBeGreaterThan(0);
    for (const p of [...jiuli, ...ball]) {
      expect(p.status).toBe("approved");
      expect(p.images.length).toBeGreaterThan(0);
    }
    expect(packStats.productsHeld).toBe(0);
  });

  it("honours product-media-batch3-skips unless the file was re-validated as an official still", () => {
    const skips = JSON.parse(
      readFileSync(resolve(ROOT, "data/product-media-batch3-skips.json"), "utf8")
    ) as { skipped_not_images: string[] };
    const attribution = JSON.parse(
      readFileSync(resolve(ROOT, "data/product-media-batch3-hadeed-attribution.json"), "utf8")
    ) as { hadeed_official_product_stills: string[] };
    const revalidated = new Set(
      attribution.hadeed_official_product_stills.map((f) => `/images/products/steel/hadeed/${f}`)
    );
    const referenced = new Set(packProducts.flatMap((p) => p.images));
    for (const rel of skips.skipped_not_images) {
      const pub = `/images/products/${rel}`;
      if (revalidated.has(pub)) {
        expect(isRealImageFile(resolve(PUBLIC, pub.slice(1))), pub).toBe(true);
      } else {
        expect(referenced.has(pub), pub).toBe(false);
      }
    }
  });

  it("credits official Hadeed stills", () => {
    const hadeed = packProducts.filter((p) => p.packSlug === "hadeed");
    expect(hadeed.length).toBeGreaterThan(0);
    for (const p of hadeed) expect(p.specifications["Image credit"]).toMatch(/hadeed/i);
  });
});

describe("certifications", () => {
  it("are never marked verified by the pack and always link to a supplier in the catalogue", () => {
    const ids = new Set(packSuppliers.map((s) => s.id));
    for (const c of packCertifications) {
      expect(c.status).toBe("claimed");
      expect(ids.has(c.supplierId), c.id).toBe(true);
      expect(c.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("expose certificate images on the supplier record for the profile section", () => {
    const withCerts = packSuppliers.filter((s) => (s.certificationImages?.length ?? 0) > 0);
    expect(withCerts.length).toBe(packStats.suppliersWithCertImages);
    const alGharbia = getPackSupplier("al-gharbia-pipe-company-llc-ae");
    expect(alGharbia?.certificationsDetailed?.some((c) => /API 5L/i.test(c.name) && c.imageUrl)).toBe(true);
  });
});

describe("homepage products picker", () => {
  it("only picks approved products with their own real photo, spread across categories and suppliers", () => {
    const products = packProducts.map(scrapedToProduct);
    const picked = pickHomeProducts(products);
    expect(picked.length).toBeGreaterThanOrEqual(12);
    for (const p of picked) expect(p.image).toMatch(/^\/images\//);
    const firstTwelve = picked.slice(0, 12);
    expect(new Set(firstTwelve.map((p) => p.category)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(firstTwelve.map((p) => p.supplierId)).size).toBe(firstTwelve.length);
    expect(homeProductCategories(picked)[0]).toBe("Steel & Metals");
  });

  it("is deterministic", () => {
    const products = packProducts.map(scrapedToProduct);
    expect(pickHomeProducts(products)).toEqual(pickHomeProducts([...products].reverse()));
  });

  it("maps categories to i18n keys", () => {
    expect(homeCategoryKey("Steel & Metals")).toBe("steelAndMetals");
    expect(homeCategoryKey("Cables & Electrical")).toBe("cablesAndElectrical");
    expect(homeCategoryKey("Industrial Parts")).toBe("industrialParts");
  });
});
