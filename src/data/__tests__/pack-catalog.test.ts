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
    const packOnly = packSuppliers.filter((s) => !s.overlaysExisting && !s.productHostOnly).length;
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

describe("daily 2026-09-10 cleared wire", () => {
  const millsOk = [
    "california-steel-industries",
    "erdemir",
    "graco",
    "hydac",
    "sanyo-special-steel",
    "tfkable",
    "voith",
  ];
  const millsSoft = [
    "beckhoff",
    "bull-moose-tube",
    "epiroc",
    "hi-tech-pipes",
    "mannesmann-line-pipe",
    "martin-marietta",
    "nidec",
    "nord-drivesystems",
    "nordson",
    "saica",
    "searing-industries",
    "shandong-molong",
    "worthington-steel",
  ];
  const productsWire = [
    "nord-drivesystems",
    "nordson",
    "beckhoff",
    "plymouth-tube",
    "hi-tech-pipes",
    "bull-moose-tube",
    "welded-tube-canada",
    "searing-industries",
    "spx-flow",
    "voith",
    "nidec",
    "hydac",
    "lenze",
    "erdemir",
    "worthington-steel",
  ];
  const millHolds = ["rr-kabel"];
  const productHolds = [
    "tubos-reunidos",
    "suraj",
    "bri-steel",
    "michigan-seamless-tube",
    "mannesmann-line-pipe",
    "shandong-molong",
    "superior-tube",
    "proampac",
    "saica",
    "visy",
    "winpak",
    "kloeckner-pentaplast",
    "fedrigoni",
    "greiner-packaging",
    "pactiv-evergreen",
    "albea",
    "lee-man-paper",
    "epiroc",
    "regal-rexnord",
    "graco",
    "weg",
    "ifm",
    "kennametal",
    "hepcomotion",
    "rollon",
    "schneeberger",
    "nb-corporation",
    "sanyo-special-steel",
    "california-steel-industries",
    "ozkan-steel",
    "hellenic-cables",
    "tfkable",
    "rr-kabel",
    "kingspan",
    "martin-marietta",
  ];
  const categoryFill = ["hi-tech-pipes", "bull-moose-tube", "searing-industries", "shandong-molong"];
  const softTubes = [
    "plymouth-tube",
    "hi-tech-pipes",
    "bull-moose-tube",
    "welded-tube-canada",
    "searing-industries",
  ];

  const dayMills = packSuppliers.filter((s) => s.pack === "daily-2026-09-10" && !s.productHostOnly);
  const dayHosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-10" && s.productHostOnly);
  const dayProducts = packProducts.filter((p) => p.pack === "d0910");

  it("wires the 20 cleared mills and 15 RFQ products", () => {
    expect(dayMills.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(dayProducts.map((p) => p.packSlug).sort()).toEqual([...productsWire].sort());
    expect(dayHosts.map((s) => s.packSlug)).toEqual([]);
  });

  it("points cards at local stills and keeps every SKU as RFQ", () => {
    for (const s of dayMills) {
      expect(s.imageUrl, s.packSlug).toMatch(/^\/images\/suppliers\//);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
    }
    for (const p of dayProducts) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
    }
  });

  it("keeps HOLD mills out of the public directory and HOLD products out of the catalogue", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const slug of millHolds) {
      const wired = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-10");
      if (wired) {
        expect(wired.productHostOnly, slug).toBe(true);
        expect(listed.has(wired.id), slug).toBe(false);
      }
    }
    for (const slug of productHolds) {
      expect(
        dayProducts.some((p) => p.packSlug === slug),
        slug
      ).toBe(false);
    }
  });

  it("soft-captions category-fill mill stills as not plant-exterior claims", () => {
    for (const slug of categoryFill) {
      const mill = dayMills.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(/not a plant-exterior claim/i);
    }
  });

  it("credits soft tube products as type-match Commons stock", () => {
    for (const slug of softTubes) {
      const sku = dayProducts.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(/type-match Wikimedia Commons stock/i);
    }
  });
});

describe("HOLD30 cleared mill wire", () => {
  const millsOk = [
    "albea",
    "bri-steel",
    "fedrigoni",
    "greiner-packaging",
    "hellenic-cables",
    "kingspan",
    "lee-man-paper",
    "ozkan-steel",
    "pactiv-evergreen",
    "plymouth-tube",
    "proampac",
    "rollon",
    "schneeberger",
    "spx-flow",
    "tubos-reunidos",
    "weg",
    "superior-tube",
    "welded-tube-canada",
    "winpak",
  ];
  const millsSoft = [
    "hepcomotion",
    "ifm",
    "kennametal",
    "kloeckner-pentaplast",
    "lenze",
    "michigan-seamless-tube",
    "nb-corporation",
    "regal-rexnord",
    "suraj",
    "visy",
  ];
  const foreverOut = ["rr-kabel"];
  const lockedDaily20 = [
    "beckhoff",
    "bull-moose-tube",
    "california-steel-industries",
    "epiroc",
    "erdemir",
    "graco",
    "hi-tech-pipes",
    "hydac",
    "mannesmann-line-pipe",
    "martin-marietta",
    "nidec",
    "nord-drivesystems",
    "nordson",
    "saica",
    "sanyo-special-steel",
    "searing-industries",
    "shandong-molong",
    "tfkable",
    "voith",
    "worthington-steel",
  ];
  const promotedHosts = ["lenze", "plymouth-tube", "spx-flow", "welded-tube-canada"];

  const hold30 = packSuppliers.filter((s) => s.pack === "hold30-2026-09-10");

  it("appends the 29 cleared mills without rewriting the locked daily 20", () => {
    expect(hold30.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    const dailyMills = packSuppliers.filter((s) => s.pack === "daily-2026-09-10" && !s.productHostOnly);
    expect(dailyMills.map((s) => s.packSlug).sort()).toEqual([...lockedDaily20].sort());
    for (const slug of lockedDaily20) {
      expect(hold30.some((s) => s.packSlug === slug), slug).toBe(false);
    }
  });

  it("points cards at the sealed local plant still and keeps RFQ honesty", () => {
    for (const s of hold30) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
    }
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of hold30) {
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
    for (const slug of promotedHosts) {
      const sku = packProducts.find((p) => p.packSlug === slug && p.pack === "d0910");
      expect(sku, slug).toBeDefined();
      expect(sku!.basePrice, slug).toBeNull();
      expect(sku!.priceSourceType, slug).toBe("rfq");
    }
  });

  it("soft-captions the SOFT set and keeps rr-kabel out forever", () => {
    for (const slug of millsSoft) {
      const mill = hold30.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(
        /not a (brand-confirmed mill header|plant or yard exterior|mill campus|confirmed plant exterior|production floor or yard|production mill yard|confirmed production plant)/i
      );
    }
    for (const slug of foreverOut) {
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "hold30-2026-09-10"),
        slug
      ).toBe(false);
    }
    expect(packSuppliers.some((s) => s.packSlug === "rr-kabel" && s.pack === "hold30-2026-09-10")).toBe(
      false
    );
  });
});

describe("HOLD35 cleared product wire", () => {
  const productsOk = [
    "albea",
    "bri-steel",
    "california-steel-industries",
    "epiroc",
    "graco",
    "greiner-packaging",
    "hellenic-cables",
    "hepcomotion",
    "ifm",
    "kennametal",
    "kingspan",
    "lee-man-paper",
    "mannesmann-line-pipe",
    "michigan-seamless-tube",
    "nb-corporation",
    "ozkan-steel",
    "pactiv-evergreen",
    "proampac",
    "regal-rexnord",
    "rollon",
    "rr-kabel",
    "saica",
    "sanyo-special-steel",
    "schneeberger",
    "suraj",
    "weg",
    "winpak",
  ];
  const productsSoft = [
    "fedrigoni",
    "kloeckner-pentaplast",
    "martin-marietta",
    "shandong-molong",
    "superior-tube",
    "tubos-reunidos",
  ];
  const refetch2Ok = ["tfkable"];
  const refetch2Soft = ["visy"];
  const locked15 = [
    "beckhoff",
    "bull-moose-tube",
    "erdemir",
    "hi-tech-pipes",
    "hydac",
    "lenze",
    "nidec",
    "nord-drivesystems",
    "nordson",
    "plymouth-tube",
    "searing-industries",
    "spx-flow",
    "voith",
    "welded-tube-canada",
    "worthington-steel",
  ];

  const hold35 = packProducts.filter((p) => p.pack === "d0910-h35");
  const hold35r2 = packProducts.filter((p) => p.pack === "d0910-h35r2");
  const daily15 = packProducts.filter((p) => p.pack === "d0910");

  it("appends the 33 cleared RFQ SKUs without rewriting the locked 15", () => {
    expect(hold35.map((p) => p.packSlug).sort()).toEqual([...productsOk, ...productsSoft].sort());
    expect(daily15.map((p) => p.packSlug).sort()).toEqual([...locked15].sort());
    for (const slug of locked15) {
      expect(hold35.some((p) => p.packSlug === slug), slug).toBe(false);
    }
  });

  it("keeps every HOLD35 SKU as RFQ with a local still and prefers branded files", () => {
    for (const p of hold35) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
    }
  });

  it("soft-credits the SOFT six", () => {
    for (const slug of productsSoft) {
      const sku = hold35.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(
        /not (mill stock|a Klöckner Pentaplast core-film|a bagged-cement|a mill-specific|a mill-branded)/i
      );
    }
  });

  it("appends refetch2 tfkable + visy without rewriting the locked 33", () => {
    expect(hold35r2.map((p) => p.packSlug).sort()).toEqual([...refetch2Ok, ...refetch2Soft].sort());
    for (const slug of [...productsOk, ...productsSoft]) {
      expect(hold35r2.some((p) => p.packSlug === slug), slug).toBe(false);
    }
    for (const p of hold35r2) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
    }
    const visy = hold35r2.find((p) => p.packSlug === "visy");
    expect(visy?.specifications["Image credit"]).toMatch(/recycling\/packaging tiles/i);
    expect(visy?.images[0]).toBe("/images/products/visy/visy-glass.jpg");
  });
});

describe("daily 2026-09-11 cleared wire", () => {
  const millsOk = ["clearwater-paper", "stelco", "sterlite-technologies", "suedpack"];
  const millsSoft = ["balluff", "bucher-hydraulics", "hawe", "printpack", "wienerberger"];
  const productsSoft = [
    "atlas-tube",
    "balluff",
    "metal-matic",
    "plastipak",
    "sharon-tube",
    "stelco",
    "valmont-tubing",
    "venus-pipes",
    "wheatland-tube",
  ];
  const productOnlyHosts = [
    "atlas-tube",
    "metal-matic",
    "plastipak",
    "sharon-tube",
    "valmont-tubing",
    "venus-pipes",
    "wheatland-tube",
  ];
  const hardSkip12Hold = [
    "atlas-tube",
    "centravis",
    "cosmo-films",
    "handytube",
    "linmot",
    "metal-matic",
    "mukand",
    "pilz",
    "service-wire",
    "venus-pipes",
    "wipak",
  ];
  const softTubes = [
    "atlas-tube",
    "metal-matic",
    "sharon-tube",
    "valmont-tubing",
    "venus-pipes",
    "wheatland-tube",
  ];
  const lockedDaily20 = [
    "beckhoff",
    "bull-moose-tube",
    "california-steel-industries",
    "epiroc",
    "erdemir",
    "graco",
    "hi-tech-pipes",
    "hydac",
    "mannesmann-line-pipe",
    "martin-marietta",
    "nidec",
    "nord-drivesystems",
    "nordson",
    "saica",
    "sanyo-special-steel",
    "searing-industries",
    "shandong-molong",
    "tfkable",
    "voith",
    "worthington-steel",
  ];

  const dayMills = packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly);
  const dayHosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && s.productHostOnly);
  const dayProducts = packProducts.filter((p) => p.pack === "d0911");

  it("wires the 9 cleared mills and 9 RFQ products without rewriting locked packs", () => {
    expect(dayMills.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(dayProducts.map((p) => p.packSlug).sort()).toEqual([...productsSoft].sort());
    expect(dayHosts.map((s) => s.packSlug).sort()).toEqual([...productOnlyHosts].sort());
    const daily10 = packSuppliers.filter((s) => s.pack === "daily-2026-09-10" && !s.productHostOnly);
    expect(daily10.map((s) => s.packSlug).sort()).toEqual([...lockedDaily20].sort());
    expect(packProducts.filter((p) => p.pack === "d0910")).toHaveLength(15);
    expect(packProducts.filter((p) => p.pack === "d0910-h35")).toHaveLength(33);
    expect(packProducts.filter((p) => p.pack === "d0910-h35r2")).toHaveLength(2);
    expect(packSuppliers.filter((s) => s.pack === "hold30-2026-09-10")).toHaveLength(29);
  });

  it("points cards at local stills and keeps every SKU as RFQ", () => {
    for (const s of dayMills) {
      expect(s.imageUrl, s.packSlug).toMatch(/^\/images\/suppliers\//);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect((s.supplierImages ?? []).length, s.packSlug).toBeGreaterThan(0);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.certificationsDetailed ?? [], s.packSlug).toEqual([]);
    }
    for (const p of dayProducts) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
      expect(JSON.stringify(p), p.id).not.toMatch(/\$0\.00/);
      expect(p.specifications["Image credit"] ?? "", p.id).not.toMatch(/AI-generated/i);
    }
  });

  it("keeps HOLD mills out of the public directory and does not invent a parent zekelman card", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const slug of productOnlyHosts) {
      const host = dayHosts.find((s) => s.packSlug === slug);
      expect(host, slug).toBeDefined();
      expect(host!.productHostOnly, slug).toBe(true);
      expect(host!.supplierImages ?? [], slug).toEqual([]);
      expect(listed.has(host!.id), slug).toBe(false);
    }
    for (const slug of hardSkip12Hold) {
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-11" && !s.productHostOnly),
        slug
      ).toBe(false);
    }
    expect(packSuppliers.some((s) => s.packSlug === "zekelman" && s.pack === "daily-2026-09-11")).toBe(
      false
    );
    const lockedZekelman = packSuppliers.find((s) => s.packSlug === "zekelman" && s.pack === "daily-2026-09-03");
    expect(lockedZekelman).toBeDefined();
    expect(dayHosts.find((s) => s.packSlug === "wheatland-tube")!.id).not.toBe(lockedZekelman!.id);
    expect(dayHosts.find((s) => s.packSlug === "atlas-tube")!.id).not.toBe(lockedZekelman!.id);
  });

  it("soft-captions campus/HQ/booth/museum fills as not plant-exterior claims", () => {
    for (const slug of millsSoft) {
      const mill = dayMills.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(/not a plant-exterior claim/i);
    }
    const wienerberger = dayMills.find((s) => s.packSlug === "wienerberger");
    expect(wienerberger!.supplierImages).toEqual(["/images/suppliers/wienerberger/wienerberger_01.jpg"]);
    expect(wienerberger!.imageUrl).toBe("/images/suppliers/wienerberger/wienerberger_01.jpg");
  });

  it("credits soft products as type-match Commons stock, not mill-specific plant claims", () => {
    for (const slug of softTubes) {
      const sku = dayProducts.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(/type-match Wikimedia Commons stock/i);
    }
    for (const slug of ["balluff", "plastipak", "stelco"]) {
      const sku = dayProducts.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(/not a mill-specific/i);
    }
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
