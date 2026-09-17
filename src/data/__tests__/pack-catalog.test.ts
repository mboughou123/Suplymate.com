import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  packCertifications,
  packProducts,
  packStats,
  packSuppliers,
  mergePackSuppliers,
  mergePackProducts,
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

  it("merges pack products onto a leftover scrape without dropping RFQ SKUs", () => {
    const leftover = [
      {
        ...packProducts[0],
        id: "scraped-leftover",
        images: ["https://example.test/hotlink.jpg"],
      },
    ];
    const merged = mergePackProducts(leftover);
    const ids = merged.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(merged.length).toBe(1 + packProducts.filter((p) => p.status === "approved").length);
    expect(merged[0].id).toBe("scraped-leftover");
    const allied = merged.find((p) => p.id.includes("allied-tube-conduit"));
    expect(allied).toBeDefined();
    expect(allied!.basePrice).toBeNull();
    expect(allied!.images[0]).toMatch(/^\/images\/products\//);
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
  const productOnlyHosts = [];
  const promoted0911Hosts = [
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
    expect(dayHosts).toHaveLength(0);
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
    for (const slug of ["wheatland-tube", "atlas-tube"]) {
      const mill = packSuppliers.find((s) => s.packSlug === slug && !s.productHostOnly);
      expect(mill, slug).toBeDefined();
      expect(mill!.id, slug).not.toBe(lockedZekelman!.id);
      expect(listed.has(mill!.id), slug).toBe(true);
    }
    for (const slug of promoted0911Hosts) {
      expect(dayHosts.some((s) => s.packSlug === slug), slug).toBe(false);
    }
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

describe("daily 2026-09-11 skip12 mill catch-up", () => {
  const millsOk = [
    "atlas-tube",
    "centravis",
    "cosmo-films",
    "handytube",
    "metal-matic",
    "mukand",
    "pilz",
    "service-wire",
    "venus-pipes",
    "wipak",
  ];
  const millsSoft = ["linmot"];
  const alreadyWired = ["wienerberger"];
  const skip12 = packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12");

  it("appends the 11 not-yet-wired skip12 mills and leaves wienerberger on the locked 9/11 card", () => {
    expect(skip12.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    for (const slug of alreadyWired) {
      expect(skip12.some((s) => s.packSlug === slug), slug).toBe(false);
      const locked = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-11");
      expect(locked, slug).toBeDefined();
      expect(locked!.productHostOnly, slug).toBeFalsy();
    }
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
  });

  it("points cards at the sealed local plant still and keeps RFQ honesty", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of skip12) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
  });

  it("soft-captions linmot as HQ/campus not production floor", () => {
    const linmot = skip12.find((s) => s.packSlug === "linmot");
    expect(linmot).toBeDefined();
    expect(linmot!.description).toMatch(/Spreitenbach campus|not production floor|not a confirmed plant-exterior/i);
  });
});

describe("daily 2026-09-11 HOLD rest30 mill catch-up", () => {
  const millsOk = [
    "artrom",
    "bishop-wisecarver",
    "epl-limited",
    "graham-packaging",
    "jindal-stainless",
    "kalyani-steels",
    "retal",
    "sber",
    "sharon-tube",
    "thompson-pipe",
    "thomson-linear",
    "tratos",
    "valmont-tubing",
    "weidmuller",
    "wheatland-tube",
  ];
  const millsSoft = [
    "banner-engineering",
    "basler",
    "cognex",
    "columbus-stainless",
    "etex",
    "fine-tubes",
    "iko",
    "logoplaste",
    "murrelektronik",
    "pbc-linear",
    "plastipak",
    "rbc-bearings",
    "sullair",
    "turck",
    "wago",
  ];
  const rest30 = packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30");

  it("appends the 30 rest30 mills without rewriting locked 9/11 or skip12 cards", () => {
    expect(rest30.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.some((s) => s.packSlug === "zekelman" && s.pack === "daily-2026-09-11-rest30")).toBe(
      false
    );
  });

  it("points cards at the sealed local plant still and keeps RFQ honesty", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of rest30) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
  });

  it("soft-captions the SOFT 15 from the rest30 manifest", () => {
    for (const slug of millsSoft) {
      const mill = rest30.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(
        /not a confirmed plant-exterior|not production floor|HQ campus|affiliate|branding not/i
      );
    }
  });
});

describe("daily 2026-09-11 HOLD41 product catch-up", () => {
  const productsOk = [
    "banner-engineering",
    "basler",
    "bishop-wisecarver",
    "cognex",
    "epl-limited",
    "graham-packaging",
    "handytube",
    "hawe",
    "iko",
    "pilz",
    "printpack",
    "rbc-bearings",
    "retal",
    "sullair",
    "thomson-linear",
    "wago",
    "weidmuller",
    "wienerberger",
    "wipak",
  ];
  const productsSoft = [
    "bucher-hydraulics",
    "centravis",
    "columbus-stainless",
    "cosmo-films",
    "fine-tubes",
    "jindal-stainless",
    "linmot",
    "logoplaste",
    "mukand",
    "pbc-linear",
    "service-wire",
    "thompson-pipe",
    "tratos",
  ];
  const blocked = [
    "artrom",
    "clearwater-paper",
    "etex",
    "kalyani-steels",
    "murrelektronik",
    "sber",
    "sterlite-technologies",
    "suedpack",
    "turck",
  ];
  const lockedSoft9 = [
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
  const hold41 = packProducts.filter((p) => p.pack === "d0911-h41");
  const soft9 = packProducts.filter((p) => p.pack === "d0911");

  it("appends the 32 cleared RFQ SKUs without rewriting the locked soft-9", () => {
    expect(hold41.map((p) => p.packSlug).sort()).toEqual([...productsOk, ...productsSoft].sort());
    expect(soft9.map((p) => p.packSlug).sort()).toEqual([...lockedSoft9].sort());
    for (const slug of lockedSoft9) {
      expect(hold41.some((p) => p.packSlug === slug), slug).toBe(false);
    }
  });

  it("keeps every HOLD41 SKU as RFQ with a local still and prefers branded files", () => {
    for (const p of hold41) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
    }
  });

  it("soft-credits the SOFT 13 from the HOLD41 manifest and keeps blocked 9 out", () => {
    for (const slug of productsSoft) {
      const sku = hold41.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(
        /CGI|type-match|collage|application|catalog|diagram|not (photo|stock stills|branded product still)/i
      );
    }
    for (const slug of blocked) {
      expect(hold41.some((p) => p.packSlug === slug), slug).toBe(false);
    }
  });
});

describe("daily 2026-09-14 product wire", () => {
  const productsOk = ["dmg-mori"];
  const productsSoft = [
    "allied-tube-conduit",
    "ammeraal-beltech",
    "aubert-duval",
    "bando-chemical",
    "calpipe-industries",
    "ejot",
    "gibson-stainless",
    "haynes-international",
    "keyence",
    "kuka",
    "maruichi-leavitt",
    "mazak",
    "mitsubishi-electric",
    "nord-lock",
    "nucor-tubular",
    "okuma",
    "optibelt",
    "ovako",
    "pregis",
    "ptc",
    "schott-ag",
    "swiss-steel",
    "vega-grieshaber",
    "vest-llc",
    "voestalpine-krems",
    "western-tube-conduit",
    "worthington-enterprises",
  ];
  const holdOut = [
    "ariel-corporation",
    "burgo-group",
    "certainteed",
    "dart-container",
    "domtar",
    "dynamic-cables",
    "electrosteel-castings",
    "glenroy",
    "holmen",
    "hydraforce",
    "jindal-pipe-usa",
    "jindal-poly-films",
    "midal-cables",
    "moog",
    "okonite",
    "pennengineering",
    "psl-limited",
    "sun-hydraulics",
    "syntegon",
    "taghleef",
    "tcpl-packaging",
    "usg",
  ];
  const promotedToMills = [
    "allied-tube-conduit",
    "ammeraal-beltech",
    "aubert-duval",
    "bando-chemical",
    "dmg-mori",
    "ejot",
    "haynes-international",
    "keyence",
    "kuka",
    "maruichi-leavitt",
    "mazak",
    "mitsubishi-electric",
    "nord-lock",
    "nucor-tubular",
    "okuma",
    "optibelt",
    "ovako",
    "pregis",
    "ptc",
    "schott-ag",
    "swiss-steel",
    "vega-grieshaber",
    "vest-llc",
    "voestalpine-krems",
    "western-tube-conduit",
    "worthington-enterprises",
    "calpipe-industries",
    "gibson-stainless",
  ];
  const remainingHosts = [...productsOk, ...productsSoft].filter((slug) => !promotedToMills.includes(slug));
  const dayProducts = packProducts.filter((p) => p.pack === "d0914");
  const dayHosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && s.productHostOnly);

  it("wires the 28 RFQ products and keeps locked 9/11 product packs", () => {
    expect(dayProducts.map((p) => p.packSlug).sort()).toEqual([...productsOk, ...productsSoft].sort());
    expect(dayHosts.map((s) => s.packSlug).sort()).toEqual([...remainingHosts].sort());
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
    expect(packProducts.filter((p) => p.pack === "d0911-h41")).toHaveLength(32);
  });

  it("keeps every 9/14 SKU as RFQ with a local still and HOLD 22 products out", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const p of dayProducts) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
    }
    for (const host of dayHosts) {
      expect(host.productHostOnly, host.packSlug).toBe(true);
      expect(listed.has(host.id), host.packSlug).toBe(false);
    }
    for (const slug of holdOut) {
      expect(dayProducts.some((p) => p.packSlug === slug), slug).toBe(false);
    }
  });

  it("soft-credits the SOFT 27 from the 9/14 manifest", () => {
    for (const slug of productsSoft) {
      const sku = dayProducts.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(/type-match|soft /i);
    }
    const dmg = dayProducts.find((p) => p.packSlug === "dmg-mori");
    expect(dmg?.specifications["Image credit"]).toBeUndefined();
  });
});

describe("daily 2026-09-14 mill wire", () => {
  const millsOk = ["certainteed", "dmg-mori", "kuka", "mazak", "moog", "okuma", "usg"];
  const millsSoft = [
    "aubert-duval",
    "domtar",
    "haynes-international",
    "holmen",
    "keyence",
    "mitsubishi-electric",
    "okonite",
    "ovako",
    "schott-ag",
  ];
  const categoryFillHold = [
    "allied-tube-conduit",
    "ammeraal-beltech",
    "bando-chemical",
    "calpipe-industries",
    "ejot",
    "gibson-stainless",
    "maruichi-leavitt",
    "nord-lock",
    "nucor-tubular",
    "optibelt",
    "pregis",
    "ptc",
    "vest-llc",
  ];
  const dayMills = packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly);

  it("appends the 16 cleared mills without rewriting locked packs", () => {
    expect(dayMills.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30")).toHaveLength(30);
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
  });

  it("points cards at the sealed local plant still, uses kuka_01 as primary, and keeps RFQ honesty", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of dayMills) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
    const kuka = dayMills.find((s) => s.packSlug === "kuka");
    expect(kuka!.imageUrl).toBe("/images/suppliers/kuka/kuka_01.jpg");
    expect(kuka!.supplierImages).toEqual(["/images/suppliers/kuka/kuka_01.jpg"]);
  });

  it("soft-captions the SOFT 9 and keeps HOLD mills including category-fills out", () => {
    for (const slug of millsSoft) {
      const mill = dayMills.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(
        /not a confirmed plant-exterior|not (active melt|paper mill|Haynes plant|manufacturing plant|MELCO plant|cable plant|current Ovako plant|Mainz plant)|landmark|HQ|historical/i
      );
    }
    for (const slug of categoryFillHold) {
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-14" && !s.productHostOnly),
        slug
      ).toBe(false);
    }
  });
});

describe("daily 2026-09-14 HOLD22 product catch-up", () => {
  const productsOk = [
    "certainteed",
    "dart-container",
    "domtar",
    "glenroy",
    "moog",
    "okonite",
    "pennengineering",
    "sun-hydraulics",
    "syntegon",
    "taghleef",
    "usg",
  ];
  const productsSoft = [
    "ariel-corporation",
    "burgo-group",
    "dynamic-cables",
    "electrosteel-castings",
    "holmen",
    "hydraforce",
    "jindal-pipe-usa",
    "jindal-poly-films",
    "midal-cables",
    "psl-limited",
    "tcpl-packaging",
  ];
  const alreadyMills = ["certainteed", "domtar", "holmen", "moog", "okonite", "usg"];
  const promotedToHold33 = [
    "ariel-corporation",
    "burgo-group",
    "dart-container",
    "electrosteel-castings",
    "glenroy",
    "jindal-pipe-usa",
    "jindal-poly-films",
    "midal-cables",
    "pennengineering",
    "sun-hydraulics",
    "syntegon",
    "taghleef",
    "tcpl-packaging",
  ];
  const promotedToHold4 = ["dynamic-cables", "hydraforce"];
  const remainingHosts = [...productsOk, ...productsSoft].filter(
    (slug) =>
      !alreadyMills.includes(slug) && !promotedToHold33.includes(slug) && !promotedToHold4.includes(slug)
  );
  const lockedD0914 = [
    "allied-tube-conduit",
    "ammeraal-beltech",
    "aubert-duval",
    "bando-chemical",
    "calpipe-industries",
    "dmg-mori",
    "ejot",
    "gibson-stainless",
    "haynes-international",
    "keyence",
    "kuka",
    "maruichi-leavitt",
    "mazak",
    "mitsubishi-electric",
    "nord-lock",
    "nucor-tubular",
    "okuma",
    "optibelt",
    "ovako",
    "pregis",
    "ptc",
    "schott-ag",
    "swiss-steel",
    "vega-grieshaber",
    "vest-llc",
    "voestalpine-krems",
    "western-tube-conduit",
    "worthington-enterprises",
  ];
  const hold22 = packProducts.filter((p) => p.pack === "d0914-h22");
  const day0914 = packProducts.filter((p) => p.pack === "d0914");
  const hold22Hosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold22");

  it("appends the 22 cleared RFQ SKUs without rewriting locked 9/14 products", () => {
    expect(hold22.map((p) => p.packSlug).sort()).toEqual([...productsOk, ...productsSoft].sort());
    expect(day0914.map((p) => p.packSlug).sort()).toEqual([...lockedD0914].sort());
    expect(day0914).toHaveLength(28);
    for (const slug of lockedD0914) {
      expect(hold22.some((p) => p.packSlug === slug), slug).toBe(false);
    }
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
    expect(packProducts.filter((p) => p.pack === "d0911-h41")).toHaveLength(32);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly)).toHaveLength(16);
  });

  it("keeps every HOLD22 SKU as RFQ with a local still and prefers branded files", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const p of hold22) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
      expect(JSON.stringify(p), p.id).not.toMatch(/\$0\.00/);
    }
    for (const slug of alreadyMills) {
      expect(hold22Hosts.some((s) => s.packSlug === slug), slug).toBe(false);
      const mill = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-14" && !s.productHostOnly);
      expect(mill, slug).toBeDefined();
      expect(listed.has(mill!.id), slug).toBe(true);
    }
    expect(hold22Hosts.map((s) => s.packSlug).sort()).toEqual([...remainingHosts].sort());
    for (const host of hold22Hosts) {
      expect(host.productHostOnly, host.packSlug).toBe(true);
      expect(listed.has(host.id), host.packSlug).toBe(false);
    }
  });

  it("soft-credits the SOFT 11 from the HOLD22 manifest", () => {
    for (const slug of productsSoft) {
      const sku = hold22.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(
        /CGI|type-match|collage|application|marketing|process|showcase|not photo/i
      );
    }
    for (const slug of productsOk) {
      const sku = hold22.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toBeUndefined();
    }
    const dmg = day0914.find((p) => p.packSlug === "dmg-mori");
    expect(dmg).toBeDefined();
    expect(dmg!.specifications["Image credit"]).toBeUndefined();
  });
});

describe("daily 2026-09-14 HOLD33 mill catch-up", () => {
  const millsOk = [
    "ammeraal-beltech",
    "ariel-corporation",
    "ejot",
    "glenroy",
    "maruichi-leavitt",
    "nucor-tubular",
    "voestalpine-krems",
  ];
  const millsSoft = [
    "allied-tube-conduit",
    "bando-chemical",
    "burgo-group",
    "dart-container",
    "electrosteel-castings",
    "jindal-pipe-usa",
    "jindal-poly-films",
    "midal-cables",
    "nord-lock",
    "optibelt",
    "pennengineering",
    "pregis",
    "ptc",
    "sun-hydraulics",
    "swiss-steel",
    "syntegon",
    "taghleef",
    "tcpl-packaging",
    "vega-grieshaber",
    "vest-llc",
    "western-tube-conduit",
    "worthington-enterprises",
  ];
  const holdOut = ["calpipe-industries", "dynamic-cables", "gibson-stainless", "hydraforce"];
  const blocked = ["psl-limited"];
  const hold33 = packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold33");
  const locked0914 = packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly);

  it("appends the 29 cleared mills without rewriting locked PR #37 cards", () => {
    expect(hold33.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(locked0914).toHaveLength(16);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30")).toHaveLength(30);
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    const voest = packSuppliers.find((s) => s.packSlug === "voestalpine");
    expect(voest?.pack).toBe("daily-2026-09-02");
    expect(voest?.supplierImages).toEqual(["/images/suppliers/voestalpine/01.jpg"]);
  });

  it("points cards at the sealed local plant still, keeps RFQ honesty, and promotes product hosts", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of hold33) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
    for (const slug of [...millsOk, ...millsSoft]) {
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-14" && s.productHostOnly),
        slug
      ).toBe(false);
      expect(packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-14-hold22"), slug).toBe(
        false
      );
    }
  });

  it("soft-captions the SOFT 22 from the HOLD33 manifest and keeps HOLD/blocked mills out", () => {
    for (const slug of millsSoft) {
      const mill = hold33.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(
        /not a confirmed plant-exterior|not production floor|HQ campus|campus|warehouse|gate|aerial|monument|stock still|not mill floor/i
      );
    }
    for (const slug of millsOk) {
      const mill = hold33.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).not.toMatch(/not a confirmed plant-exterior/i);
    }
    for (const slug of [...holdOut, ...blocked]) {
      expect(hold33.some((s) => s.packSlug === slug), slug).toBe(false);
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-14" && !s.productHostOnly),
        slug
      ).toBe(false);
    }
  });
});

describe("daily 2026-09-14 HOLD4 mill refetch", () => {
  const millsOk = ["dynamic-cables"];
  const millsSoft = ["calpipe-industries", "gibson-stainless", "hydraforce"];
  const blocked = ["psl-limited"];
  const hold4 = packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold4");
  const locked0914 = packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly);
  const lockedHold33 = packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold33");
  const softCaptions: Record<string, RegExp> = {
    "calpipe-industries": /split collage|not a single plant exterior/i,
    "gibson-stainless": /Greensburg Industrial Park|campus\/HQ|not production floor/i,
    hydraforce: /warehouse\/plant-tour interior|not a plant exterior/i,
  };

  it("appends the 4 cleared mills without rewriting locked HOLD33 or PR #37 cards", () => {
    expect(hold4.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(locked0914).toHaveLength(16);
    expect(lockedHold33).toHaveLength(29);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30")).toHaveLength(30);
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
  });

  it("points cards at the sealed local plant still, keeps RFQ honesty, and promotes product hosts", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of hold4) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
    for (const slug of [...millsOk, ...millsSoft]) {
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-14" && s.productHostOnly),
        slug
      ).toBe(false);
      expect(packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-14-hold22"), slug).toBe(
        false
      );
      expect(packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-14-hold33"), slug).toBe(
        false
      );
    }
  });

  it("soft-captions the SOFT 3 from the HOLD4 seal and keeps OK / blocked mills honest", () => {
    for (const slug of millsSoft) {
      const mill = hold4.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(softCaptions[slug]);
    }
    const ok = hold4.find((s) => s.packSlug === "dynamic-cables");
    expect(ok).toBeDefined();
    expect(ok!.description).not.toMatch(/not a (confirmed )?plant-exterior|split collage|campus\/HQ|warehouse/i);
    for (const slug of blocked) {
      expect(hold4.some((s) => s.packSlug === slug), slug).toBe(false);
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-14" && !s.productHostOnly),
        slug
      ).toBe(false);
      const host = packSuppliers.find((s) => s.packSlug === slug);
      expect(host, slug).toBeDefined();
      expect(host!.productHostOnly, slug).toBe(true);
      expect(host!.pack, slug).toBe("daily-2026-09-14-hold22");
    }
  });
});

describe("daily 2026-09-15 cleared wire", () => {
  const millsOk = ["dillinger", "forbo-siegling", "krones", "piramal-glass"];
  const millsSoft = ["dayco", "gaf", "intralox", "schunk"];
  const productsOk = ["krones"];
  const productsSoft = [
    "anvil-international",
    "auma",
    "big-river-steel",
    "bobst",
    "dillinger",
    "intertape-polymer",
    "intralox",
    "jtl-industries",
    "koenig-bauer",
    "kumkang-kind",
    "nova-tube",
    "phillips-tube-group",
    "piramal-glass",
    "schunk",
    "sgd-pharma",
    "universal-stainless",
  ];
  const millHold = [
    "amiantit",
    "amiblu",
    "anvil-international",
    "apar-industries",
    "auma",
    "big-river-steel",
    "bobst",
    "brugg-cables",
    "bulten",
    "cerro-wire",
    "circor",
    "ckd-corporation",
    "comau",
    "dorner",
    "ester-industries",
    "future-pipe-industries",
    "garware-hitech-films",
    "haas-automation",
    "harting",
    "hobas-pipe-usa",
    "intertape-polymer",
    "jtl-industries",
    "koenig-bauer",
    "kumkang-kind",
    "mapei",
    "mcwane-ductile",
    "menasha-packaging",
    "nedschroef",
    "nova-tube",
    "olympic-steel",
    "phillips-tube-group",
    "polyplex",
    "saha-thai-steel-pipe",
    "sgd-pharma",
    "staubli",
    "stoelzle-glass",
    "tc-transcontinental",
    "timkensteel",
    "universal-stainless",
    "us-pipe",
    "vacmet",
    "zimmer-group",
  ];
  const productHold = [
    "amiantit",
    "amiblu",
    "apar-industries",
    "brugg-cables",
    "bulten",
    "cerro-wire",
    "circor",
    "ckd-corporation",
    "comau",
    "dayco",
    "dorner",
    "ester-industries",
    "forbo-siegling",
    "future-pipe-industries",
    "gaf",
    "garware-hitech-films",
    "haas-automation",
    "harting",
    "hobas-pipe-usa",
    "mapei",
    "mcwane-ductile",
    "menasha-packaging",
    "nedschroef",
    "olympic-steel",
    "polyplex",
    "saha-thai-steel-pipe",
    "staubli",
    "stoelzle-glass",
    "tc-transcontinental",
    "timkensteel",
    "us-pipe",
    "vacmet",
    "zimmer-group",
  ];
  const hold39Mills = [
    "amiantit",
    "bobst",
    "comau",
    "nedschroef",
    "saha-thai-steel-pipe",
    "staubli",
    "amiblu",
    "auma",
    "big-river-steel",
    "brugg-cables",
    "cerro-wire",
    "ckd-corporation",
    "ester-industries",
    "future-pipe-industries",
    "garware-hitech-films",
    "harting",
    "hobas-pipe-usa",
    "intertape-polymer",
    "kumkang-kind",
    "mapei",
    "mcwane-ductile",
    "menasha-packaging",
    "nova-tube",
    "phillips-tube-group",
    "polyplex",
    "sgd-pharma",
    "stoelzle-glass",
    "tc-transcontinental",
    "timkensteel",
    "universal-stainless",
    "us-pipe",
    "vacmet",
  ];
  const hold7Mills = [
    "bulten",
    "haas-automation",
    "koenig-bauer",
    "dorner",
    "jtl-industries",
    "zimmer-group",
  ];
  const anvilMills = ["anvil-international"];
  const remainingHosts = [...productsOk, ...productsSoft].filter(
    (slug) =>
      ![...millsOk, ...millsSoft, ...hold39Mills, ...hold7Mills, ...anvilMills].includes(slug)
  );
  const softCaptions: Record<string, RegExp> = {
    dayco: /Dayco Birmingham MI HQ|HQ campus|not a manufacturing plant/i,
    gaf: /GAF commercial-roofing|Tampa plant|not a confirmed plant-exterior/i,
    intralox: /Intralox USA Corporate Headquarters|HQ campus|not a conveyor plant floor/i,
    schunk: /Hannover Messe|Entwicklungszentrum ZEUS|not a confirmed plant-exterior/i,
  };
  const dayMills = packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && !s.productHostOnly);
  const dayHosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && s.productHostOnly);
  const dayProducts = packProducts.filter((p) => p.pack === "d0915");

  it("appends the 8 cleared mills and 17 RFQ products without rewriting locked packs", () => {
    expect(dayMills.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(dayProducts.map((p) => p.packSlug).sort()).toEqual([...productsOk, ...productsSoft].sort());
    expect(dayHosts.map((s) => s.packSlug).sort()).toEqual([...remainingHosts].sort());
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly)).toHaveLength(16);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold33")).toHaveLength(29);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold4")).toHaveLength(4);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30")).toHaveLength(30);
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold39")).toHaveLength(32);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold7")).toHaveLength(6);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-anvil")).toHaveLength(1);
  });

  it("points cards at local stills, keeps RFQ honesty, and skips invented certs", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of dayMills) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(s.certificationsDetailed ?? [], s.packSlug).toEqual([]);
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
    const forbo = dayMills.find((s) => s.packSlug === "forbo-siegling");
    expect(forbo!.supplierImages).toEqual(["/images/suppliers/forbo-siegling/forbo-siegling_01.jpg"]);
    const dayco = dayMills.find((s) => s.packSlug === "dayco");
    expect(dayco!.supplierImages).toEqual(["/images/suppliers/dayco/dayco_01.jpg"]);
    const gaf = dayMills.find((s) => s.packSlug === "gaf");
    expect(gaf!.supplierImages).toEqual([
      "/images/suppliers/gaf/gaf_01.jpg",
      "/images/suppliers/gaf/gaf_03.jpg",
    ]);
    const intralox = dayMills.find((s) => s.packSlug === "intralox");
    expect(intralox!.supplierImages).toEqual(["/images/suppliers/intralox/intralox_01.jpg"]);
    for (const p of dayProducts) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
      expect(JSON.stringify(p), p.id).not.toMatch(/\$0\.00/);
      expect(p.specifications["Image credit"] ?? "", p.id).not.toMatch(/AI-generated/i);
      expect(p.certifications ?? [], p.id).toEqual([]);
    }
    for (const host of dayHosts) {
      expect(host.productHostOnly, host.packSlug).toBe(true);
      expect(listed.has(host.id), host.packSlug).toBe(false);
    }
  });

  it("soft-captions the SOFT mills, soft-credits SOFT products, and keeps HOLD out", () => {
    for (const slug of millsSoft) {
      const mill = dayMills.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(softCaptions[slug]);
    }
    for (const slug of millsOk) {
      const mill = dayMills.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).not.toMatch(/not a confirmed plant-exterior|HQ campus/i);
    }
    for (const slug of productsSoft) {
      const sku = dayProducts.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(/type-match|soft /i);
    }
    const krones = dayProducts.find((p) => p.packSlug === "krones");
    expect(krones).toBeDefined();
    expect(krones!.specifications["Image credit"]).toBeUndefined();
    for (const slug of millHold) {
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-15" && !s.productHostOnly),
        slug
      ).toBe(false);
    }
    for (const slug of productHold) {
      expect(dayProducts.some((p) => p.packSlug === slug), slug).toBe(false);
    }
  });
});

describe("daily 2026-09-15 HOLD33 product catch-up", () => {
  const productsSoft = [
    "amiantit",
    "amiblu",
    "apar-industries",
    "brugg-cables",
    "cerro-wire",
    "circor",
    "ckd-corporation",
    "comau",
    "dayco",
    "dorner",
    "ester-industries",
    "forbo-siegling",
    "future-pipe-industries",
    "haas-automation",
    "harting",
    "hobas-pipe-usa",
    "mapei",
    "mcwane-ductile",
    "menasha-packaging",
    "nedschroef",
    "olympic-steel",
    "saha-thai-steel-pipe",
    "staubli",
    "stoelzle-glass",
    "timkensteel",
    "us-pipe",
    "vacmet",
    "zimmer-group",
  ];
  const holdOut = ["bulten", "gaf", "garware-hitech-films", "polyplex", "tc-transcontinental"];
  const lockedD0915 = [
    "krones",
    "anvil-international",
    "auma",
    "big-river-steel",
    "bobst",
    "dillinger",
    "intertape-polymer",
    "intralox",
    "jtl-industries",
    "koenig-bauer",
    "kumkang-kind",
    "nova-tube",
    "phillips-tube-group",
    "piramal-glass",
    "schunk",
    "sgd-pharma",
    "universal-stainless",
  ];
  const alreadyMills = ["dayco", "forbo-siegling"];
  const hold39Promoted = [
    "amiantit",
    "amiblu",
    "brugg-cables",
    "cerro-wire",
    "ckd-corporation",
    "comau",
    "ester-industries",
    "future-pipe-industries",
    "harting",
    "hobas-pipe-usa",
    "mapei",
    "mcwane-ductile",
    "menasha-packaging",
    "nedschroef",
    "saha-thai-steel-pipe",
    "staubli",
    "stoelzle-glass",
    "timkensteel",
    "us-pipe",
    "vacmet",
  ];
  const hold7Promoted = ["dorner", "haas-automation", "zimmer-group"];
  const remainingHosts = productsSoft.filter(
    (slug) =>
      !alreadyMills.includes(slug) && !hold39Promoted.includes(slug) && !hold7Promoted.includes(slug)
  );
  const hold33 = packProducts.filter((p) => p.pack === "d0915-h33");
  const day0915 = packProducts.filter((p) => p.pack === "d0915");
  const hold33Hosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold33");

  it("appends the 28 soft RFQ SKUs without rewriting locked 9/15 products", () => {
    expect(hold33.map((p) => p.packSlug).sort()).toEqual([...productsSoft].sort());
    expect(day0915.map((p) => p.packSlug).sort()).toEqual([...lockedD0915].sort());
    expect(day0915).toHaveLength(17);
    for (const slug of lockedD0915) {
      expect(hold33.some((p) => p.packSlug === slug), slug).toBe(false);
    }
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
    expect(packProducts.filter((p) => p.pack === "d0911-h41")).toHaveLength(32);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && !s.productHostOnly)).toHaveLength(8);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold39")).toHaveLength(32);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold7")).toHaveLength(6);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-anvil")).toHaveLength(1);
  });

  it("keeps every HOLD33 SKU as RFQ with a local still and prefers branded files", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const p of hold33) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
      expect(JSON.stringify(p), p.id).not.toMatch(/\$0\.00/);
      expect(p.specifications["Image credit"] ?? "", p.id).not.toMatch(/AI-generated/i);
      expect(p.certifications ?? [], p.id).toEqual([]);
    }
    for (const slug of alreadyMills) {
      expect(hold33Hosts.some((s) => s.packSlug === slug), slug).toBe(false);
      const mill = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-15" && !s.productHostOnly);
      expect(mill, slug).toBeDefined();
      expect(listed.has(mill!.id), slug).toBe(true);
    }
    for (const slug of hold39Promoted) {
      expect(hold33Hosts.some((s) => s.packSlug === slug), slug).toBe(false);
      const mill = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-15-hold39");
      expect(mill, slug).toBeDefined();
      expect(mill!.productHostOnly, slug).toBeFalsy();
      expect(listed.has(mill!.id), slug).toBe(true);
    }
    for (const slug of hold7Promoted) {
      expect(hold33Hosts.some((s) => s.packSlug === slug), slug).toBe(false);
      const mill = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-15-hold7");
      expect(mill, slug).toBeDefined();
      expect(mill!.productHostOnly, slug).toBeFalsy();
      expect(listed.has(mill!.id), slug).toBe(true);
    }
    expect(hold33Hosts.map((s) => s.packSlug).sort()).toEqual([...remainingHosts].sort());
    for (const host of hold33Hosts) {
      expect(host.productHostOnly, host.packSlug).toBe(true);
      if (host.overlaysExisting) {
        expect(listed.has(host.id), host.packSlug).toBe(true);
      } else {
        expect(listed.has(host.id), host.packSlug).toBe(false);
      }
    }
  });

  it("soft-credits the SOFT 28 from the HOLD33 seal and keeps HOLD 5 out", () => {
    for (const slug of productsSoft) {
      const sku = hold33.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toMatch(
        /type-match|soft |wrong brand|no .* brand|CGI|showcase|application|process/i
      );
    }
    const circor = hold33.find((p) => p.packSlug === "circor");
    expect(circor).toBeDefined();
    expect(circor!.specifications["Image credit"]).toMatch(/Maps\+BMTF poison stems cleared/i);
    expect(circor!.specifications["Image credit"]).toMatch(/no CIRCOR brand/i);
    const krones = day0915.find((p) => p.packSlug === "krones");
    expect(krones).toBeDefined();
    expect(krones!.specifications["Image credit"]).toBeUndefined();
    for (const slug of holdOut) {
      expect(hold33.some((p) => p.packSlug === slug), slug).toBe(false);
      expect(packProducts.some((p) => p.packSlug === slug && (p.pack === "d0915" || p.pack === "d0915-h33")), slug).toBe(
        false
      );
    }
  });
});

describe("daily 2026-09-15 HOLD39 mill catch-up", () => {
  const millsOk = [
    "amiantit",
    "bobst",
    "comau",
    "nedschroef",
    "saha-thai-steel-pipe",
    "staubli",
  ];
  const millsSoft = [
    "amiblu",
    "auma",
    "big-river-steel",
    "brugg-cables",
    "cerro-wire",
    "ckd-corporation",
    "ester-industries",
    "future-pipe-industries",
    "garware-hitech-films",
    "harting",
    "hobas-pipe-usa",
    "intertape-polymer",
    "kumkang-kind",
    "mapei",
    "mcwane-ductile",
    "menasha-packaging",
    "nova-tube",
    "phillips-tube-group",
    "polyplex",
    "sgd-pharma",
    "stoelzle-glass",
    "tc-transcontinental",
    "timkensteel",
    "universal-stainless",
    "us-pipe",
    "vacmet",
  ];
  const holdOut = [
    "anvil-international",
    "bulten",
    "dorner",
    "haas-automation",
    "jtl-industries",
    "koenig-bauer",
    "zimmer-group",
  ];
  const blocked = ["apar-industries", "circor", "olympic-steel"];
  const promotedHosts = [
    "auma",
    "big-river-steel",
    "bobst",
    "intertape-polymer",
    "kumkang-kind",
    "nova-tube",
    "phillips-tube-group",
    "sgd-pharma",
    "universal-stainless",
  ];
  const leftoverHosts: string[] = [];
  const hold39 = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold39");
  const locked0915 = packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && !s.productHostOnly);
  const dayHosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && s.productHostOnly);
  const softCaptions: Record<string, RegExp> = {
    amiblu: /Amiblu|campus\/HQ|not a plant exterior/i,
    auma: /AUMA|HQ campus|campus\/office|not production floor/i,
    "big-river-steel": /Osceola|campus aerial|not production floor/i,
    "brugg-cables": /BRUGG|monument|campus|not production floor/i,
    "cerro-wire": /Cerro Wire|campus\/HQ|not production floor/i,
    "ckd-corporation": /campus|gate|not production floor/i,
    "ester-industries": /ESTER|campus gate|not production floor/i,
    "future-pipe-industries": /field-install|yard|not a plant exterior/i,
    "garware-hitech-films": /GARWARE|campus|not production floor/i,
    harting: /warehouse|not a plant exterior/i,
    "hobas-pipe-usa": /field-install|not a plant exterior/i,
    "intertape-polymer": /IPG|HQ campus|not production floor/i,
    "kumkang-kind": /Kumkang|campus aerial|not production floor/i,
    mapei: /campus aerial|not production floor/i,
    "mcwane-ductile": /yard|field|not a plant exterior/i,
    "menasha-packaging": /warehouse|campus|not production floor/i,
    "nova-tube": /Nova Steel|campus aerial|not production floor/i,
    "phillips-tube-group": /Shelbyville|campus\/HQ|not production floor/i,
    polyplex: /POLYPLEX|campus aerial|not production floor/i,
    "sgd-pharma": /campus aerial|not production floor/i,
    "stoelzle-glass": /Stoelzle|campus|not production floor/i,
    "tc-transcontinental": /campus aerial|not production floor/i,
    timkensteel: /METALLUS|HQ campus|not production floor/i,
    "universal-stainless": /hot-mill|interior|not a plant exterior/i,
    "us-pipe": /US PIPE|Bessemer|campus\/HQ|not production floor/i,
    vacmet: /campus aerial|not production floor/i,
  };

  it("appends the 32 cleared mills without rewriting locked #48/#49/#50 cards", () => {
    expect(hold39.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(locked0915).toHaveLength(8);
    expect(packProducts.filter((p) => p.pack === "d0915")).toHaveLength(17);
    expect(packProducts.filter((p) => p.pack === "d0915-h33")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0915-h5")).toHaveLength(5);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly)).toHaveLength(16);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold33")).toHaveLength(29);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold4")).toHaveLength(4);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30")).toHaveLength(30);
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold7")).toHaveLength(6);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-anvil")).toHaveLength(1);
  });

  it("points cards at the sealed local plant still, keeps RFQ honesty, and promotes product hosts", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of hold39) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(s.certificationsDetailed ?? [], s.packSlug).toEqual([]);
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
    for (const slug of [...millsOk, ...millsSoft]) {
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-15" && s.productHostOnly),
        slug
      ).toBe(false);
    }
    for (const slug of promotedHosts) {
      const mill = hold39.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.productHostOnly, slug).toBeFalsy();
    }
    expect(dayHosts.map((s) => s.packSlug).sort()).toEqual([...leftoverHosts].sort());
    const usPipe = hold39.find((s) => s.packSlug === "us-pipe");
    expect(usPipe?.overlaysExisting).toBe(true);
    expect(usPipe?.id).toBe("u-s-pipe-bessemer");
  });

  it("soft-captions the SOFT 26 from the HOLD39 seal and keeps HOLD/blocked mills out", () => {
    for (const slug of millsSoft) {
      const mill = hold39.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(softCaptions[slug]);
    }
    for (const slug of millsOk) {
      const mill = hold39.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).not.toMatch(
        /not a (confirmed )?plant-exterior|HQ campus|campus aerial|field-install|warehouse/i
      );
    }
    for (const slug of [...holdOut, ...blocked]) {
      expect(hold39.some((s) => s.packSlug === slug), slug).toBe(false);
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-15" && !s.productHostOnly),
        slug
      ).toBe(false);
    }
    for (const slug of blocked) {
      expect(packSuppliers.some((s) => s.packSlug === slug && !s.productHostOnly), slug).toBe(false);
    }
    expect(leftoverHosts).toEqual([]);
    expect(dayHosts).toEqual([]);
    const anvil = packSuppliers.find((s) => s.packSlug === "anvil-international");
    expect(anvil).toBeDefined();
    expect(anvil!.productHostOnly).toBeFalsy();
    expect(anvil!.pack).toBe("daily-2026-09-15-anvil");
  });
});

describe("daily 2026-09-15 HOLD7 mill catch-up", () => {
  const millsOk = ["bulten", "haas-automation", "koenig-bauer"];
  const millsSoft = ["dorner", "jtl-industries", "zimmer-group"];
  const holdOut = ["anvil-international"];
  const blocked = ["apar-industries", "circor", "olympic-steel"];
  const promotedHosts = [
    "dorner",
    "haas-automation",
    "jtl-industries",
    "koenig-bauer",
    "zimmer-group",
  ];
  const leftover0915Hosts: string[] = [];
  const leftoverHold33Hosts = ["apar-industries", "circor", "olympic-steel"];
  const hold7 = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold7");
  const locked0915 = packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && !s.productHostOnly);
  const lockedHold39 = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold39");
  const dayHosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && s.productHostOnly);
  const hold33Hosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold33");
  const softCaptions: Record<string, RegExp> = {
    dorner: /HQ\/campus|unbranded|not production floor/i,
    "jtl-industries": /mill interior|no JTL brand|Saha Thai|not a plant exterior/i,
    "zimmer-group": /industrial exterior|unbranded|not a (confirmed )?plant exterior/i,
  };

  it("appends the 6 cleared mills without rewriting locked #48–#55 cards", () => {
    expect(hold7.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(locked0915).toHaveLength(8);
    expect(lockedHold39).toHaveLength(32);
    expect(packProducts.filter((p) => p.pack === "d0915")).toHaveLength(17);
    expect(packProducts.filter((p) => p.pack === "d0915-h33")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0915-h5")).toHaveLength(5);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly)).toHaveLength(16);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold33")).toHaveLength(29);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold4")).toHaveLength(4);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30")).toHaveLength(30);
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-anvil")).toHaveLength(1);
  });

  it("points cards at the sealed local plant still, keeps RFQ honesty, and promotes product hosts", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of hold7) {
      expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages?.[0], s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect((s.supplierImages ?? []).every((u) => !u.includes(".BAD1.")), s.packSlug).toBe(true);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(s.certificationsDetailed ?? [], s.packSlug).toEqual([]);
      expect(listed.has(s.id), s.packSlug).toBe(true);
    }
    for (const slug of [...millsOk, ...millsSoft]) {
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-15" && s.productHostOnly),
        slug
      ).toBe(false);
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-15-hold33"),
        slug
      ).toBe(false);
    }
    for (const slug of promotedHosts) {
      const mill = hold7.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.productHostOnly, slug).toBeFalsy();
    }
    expect(dayHosts.map((s) => s.packSlug).sort()).toEqual([...leftover0915Hosts].sort());
    expect(hold33Hosts.map((s) => s.packSlug).sort()).toEqual([...leftoverHold33Hosts].sort());
  });

  it("soft-captions the SOFT 3 from the HOLD7 seal and keeps HOLD/blocked mills out", () => {
    for (const slug of millsSoft) {
      const mill = hold7.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(softCaptions[slug]);
    }
    for (const slug of millsOk) {
      const mill = hold7.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).not.toMatch(
        /not a (confirmed )?plant-exterior|HQ campus|campus aerial|field-install|warehouse|mill interior/i
      );
    }
    for (const slug of [...holdOut, ...blocked]) {
      expect(hold7.some((s) => s.packSlug === slug), slug).toBe(false);
    }
    for (const slug of blocked) {
      expect(packSuppliers.some((s) => s.packSlug === slug && !s.productHostOnly), slug).toBe(false);
    }
    expect(leftover0915Hosts).toEqual([]);
    expect(dayHosts).toEqual([]);
    const anvil = packSuppliers.find((s) => s.packSlug === "anvil-international");
    expect(anvil).toBeDefined();
    expect(anvil!.productHostOnly).toBeFalsy();
    expect(anvil!.pack).toBe("daily-2026-09-15-anvil");
    for (const slug of leftoverHold33Hosts) {
      const host = packSuppliers.find((s) => s.packSlug === slug);
      expect(host, slug).toBeDefined();
      expect(host!.productHostOnly, slug).toBe(true);
      expect(host!.pack, slug).toBe("daily-2026-09-15-hold33");
    }
  });
});

describe("daily 2026-09-15 HOLD5 product catch-up", () => {
  const productsOk = ["gaf", "polyplex", "tc-transcontinental"];
  const productsSoft = ["bulten", "garware-hitech-films"];
  const lockedD0915 = [
    "krones",
    "anvil-international",
    "auma",
    "big-river-steel",
    "bobst",
    "dillinger",
    "intertape-polymer",
    "intralox",
    "jtl-industries",
    "koenig-bauer",
    "kumkang-kind",
    "nova-tube",
    "phillips-tube-group",
    "piramal-glass",
    "schunk",
    "sgd-pharma",
    "universal-stainless",
  ];
  const lockedHold33 = [
    "amiantit",
    "amiblu",
    "apar-industries",
    "brugg-cables",
    "cerro-wire",
    "circor",
    "ckd-corporation",
    "comau",
    "dayco",
    "dorner",
    "ester-industries",
    "forbo-siegling",
    "future-pipe-industries",
    "haas-automation",
    "harting",
    "hobas-pipe-usa",
    "mapei",
    "mcwane-ductile",
    "menasha-packaging",
    "nedschroef",
    "olympic-steel",
    "saha-thai-steel-pipe",
    "staubli",
    "stoelzle-glass",
    "timkensteel",
    "us-pipe",
    "vacmet",
    "zimmer-group",
  ];
  const alreadyMills = ["gaf"];
  const hold39Promoted = ["garware-hitech-films", "polyplex", "tc-transcontinental"];
  const hold7Promoted = ["bulten"];
  const remainingHosts = [...productsOk, ...productsSoft].filter(
    (slug) =>
      !alreadyMills.includes(slug) && !hold39Promoted.includes(slug) && !hold7Promoted.includes(slug)
  );
  const hold5 = packProducts.filter((p) => p.pack === "d0915-h5");
  const day0915 = packProducts.filter((p) => p.pack === "d0915");
  const hold33 = packProducts.filter((p) => p.pack === "d0915-h33");
  const hold5Hosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold5");

  it("appends the 5 cleared RFQ SKUs without rewriting locked 9/15 products or mills", () => {
    expect(hold5.map((p) => p.packSlug).sort()).toEqual([...productsOk, ...productsSoft].sort());
    expect(day0915.map((p) => p.packSlug).sort()).toEqual([...lockedD0915].sort());
    expect(hold33.map((p) => p.packSlug).sort()).toEqual([...lockedHold33].sort());
    expect(day0915).toHaveLength(17);
    expect(hold33).toHaveLength(28);
    expect(hold5).toHaveLength(5);
    for (const slug of lockedD0915) {
      expect(hold5.some((p) => p.packSlug === slug), slug).toBe(false);
    }
    for (const slug of lockedHold33) {
      expect(hold5.some((p) => p.packSlug === slug), slug).toBe(false);
    }
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
    expect(packProducts.filter((p) => p.pack === "d0911-h41")).toHaveLength(32);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && !s.productHostOnly)).toHaveLength(8);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold39")).toHaveLength(32);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold7")).toHaveLength(6);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-anvil")).toHaveLength(1);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold33")).toHaveLength(3);
  });

  it("keeps every HOLD5 SKU as RFQ with a local still and overlays existing mill cards", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const p of hold5) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(p.images[0], p.id).not.toMatch(/mill-fallback/i);
      expect(JSON.stringify(p), p.id).not.toMatch(/\$0\.00/);
      expect(p.specifications["Image credit"] ?? "", p.id).not.toMatch(/AI-generated/i);
      expect(p.certifications ?? [], p.id).toEqual([]);
    }
    for (const slug of alreadyMills) {
      expect(hold5Hosts.some((s) => s.packSlug === slug), slug).toBe(false);
      const mill = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-15" && !s.productHostOnly);
      expect(mill, slug).toBeDefined();
      expect(listed.has(mill!.id), slug).toBe(true);
    }
    for (const slug of hold39Promoted) {
      expect(hold5Hosts.some((s) => s.packSlug === slug), slug).toBe(false);
      const mill = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-15-hold39");
      expect(mill, slug).toBeDefined();
      expect(mill!.productHostOnly, slug).toBeFalsy();
      expect(listed.has(mill!.id), slug).toBe(true);
    }
    for (const slug of hold7Promoted) {
      expect(hold5Hosts.some((s) => s.packSlug === slug), slug).toBe(false);
      const mill = packSuppliers.find((s) => s.packSlug === slug && s.pack === "daily-2026-09-15-hold7");
      expect(mill, slug).toBeDefined();
      expect(mill!.productHostOnly, slug).toBeFalsy();
      expect(listed.has(mill!.id), slug).toBe(true);
    }
    expect(remainingHosts).toEqual([]);
    expect(hold5Hosts).toEqual([]);
  });

  it("soft-credits the SOFT 2 from the HOLD5 seal and leaves OK 3 uncaptioned", () => {
    const bulten = hold5.find((p) => p.packSlug === "bulten");
    expect(bulten).toBeDefined();
    expect(bulten!.specifications["Image credit"]).toBe(
      "hex bolt assortment — soft automotive-fastener type-match, no brand"
    );
    const garware = hold5.find((p) => p.packSlug === "garware-hitech-films");
    expect(garware).toBeDefined();
    expect(garware!.specifications["Image credit"]).toBe(
      "BOPET process still — soft BOPET film category type-match, no brand mark"
    );
    for (const slug of productsOk) {
      const sku = hold5.find((p) => p.packSlug === slug);
      expect(sku, slug).toBeDefined();
      expect(sku!.specifications["Image credit"], slug).toBeUndefined();
    }
    const krones = day0915.find((p) => p.packSlug === "krones");
    expect(krones).toBeDefined();
    expect(krones!.specifications["Image credit"]).toBeUndefined();
  });
});

describe("daily 2026-09-15 anvil mill catch-up", () => {
  const millsOk = ["anvil-international"];
  const blocked = ["apar-industries", "circor", "olympic-steel"];
  const leftoverHold33Hosts = ["apar-industries", "circor", "olympic-steel"];
  const anvilPack = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-anvil");
  const locked0915 = packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && !s.productHostOnly);
  const lockedHold39 = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold39");
  const lockedHold7 = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold7");
  const dayHosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && s.productHostOnly);
  const hold33Hosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold33");

  it("appends the 1 cleared mill without rewriting locked #48–#58 cards", () => {
    expect(anvilPack.map((s) => s.packSlug)).toEqual(millsOk);
    expect(locked0915).toHaveLength(8);
    expect(lockedHold39).toHaveLength(32);
    expect(lockedHold7).toHaveLength(6);
    expect(packProducts.filter((p) => p.pack === "d0915")).toHaveLength(17);
    expect(packProducts.filter((p) => p.pack === "d0915-h33")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0915-h5")).toHaveLength(5);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly)).toHaveLength(16);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold33")).toHaveLength(29);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold4")).toHaveLength(4);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30")).toHaveLength(30);
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
  });

  it("promotes leftover anvil-international to a public mill with local _01 leading", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    const mill = anvilPack[0];
    expect(mill).toBeDefined();
    expect(mill.packSlug).toBe("anvil-international");
    expect(mill.imageUrl).toBe("/images/suppliers/anvil-international/anvil-international_01.jpg");
    expect(mill.supplierImages?.[0]).toBe("/images/suppliers/anvil-international/anvil-international_01.jpg");
    expect(mill.supplierImages).toEqual(["/images/suppliers/anvil-international/anvil-international_01.jpg"]);
    expect(mill.moq).toMatch(/RFQ/i);
    expect(mill.productHostOnly).toBeFalsy();
    expect(mill.certificationsDetailed ?? []).toEqual([]);
    expect(mill.verified).toBe(true);
    expect(listed.has(mill.id)).toBe(true);
    expect(JSON.stringify(mill)).not.toMatch(/\$0\.00/);
    expect(
      packSuppliers.some(
        (s) => s.packSlug === "anvil-international" && s.pack === "daily-2026-09-15" && s.productHostOnly
      )
    ).toBe(false);
    expect(dayHosts).toEqual([]);
    expect(hold33Hosts.map((s) => s.packSlug).sort()).toEqual([...leftoverHold33Hosts].sort());
    const anvilSku = packProducts.find((p) => p.packSlug === "anvil-international" && p.pack === "d0915");
    expect(anvilSku).toBeDefined();
    expect(anvilSku!.basePrice).toBeNull();
    expect(anvilSku!.priceSourceType).toBe("rfq");
  });

  it("leaves the OK mill uncaptioned and keeps blocked mills out", () => {
    const mill = anvilPack.find((s) => s.packSlug === "anvil-international");
    expect(mill).toBeDefined();
    expect(mill!.description).toMatch(/pipe fittings|hangers|grooved piping/i);
    expect(mill!.description).not.toMatch(
      /not a (confirmed )?plant-exterior|HQ campus|campus aerial|field-install|warehouse|mill interior|AGC|careers banner/i
    );
    for (const slug of blocked) {
      expect(anvilPack.some((s) => s.packSlug === slug), slug).toBe(false);
      expect(packSuppliers.some((s) => s.packSlug === slug && !s.productHostOnly), slug).toBe(false);
      const host = packSuppliers.find((s) => s.packSlug === slug);
      expect(host, slug).toBeDefined();
      expect(host!.productHostOnly, slug).toBe(true);
      expect(host!.pack, slug).toBe("daily-2026-09-15-hold33");
    }
  });
});

describe("daily 2026-09-17 cleared mills+products (OK5+soft4 + HOLD30)", () => {
  const millsOk = [
    "rehau",
    "trumpf",
    "ati",
    "kaiser-aluminum",
    "victaulic",
    "advanced-drainage-systems",
    "bormioli-pharma",
    "bystronic",
    "camozzi",
    "carlisle-construction",
    "ccl-industries",
    "fuji-seal",
    "john-crane",
    "nelipak",
    "oliver-healthcare",
    "tekni-plex",
    "tokyo-steel",
    "uponor",
    "wl-plastics",
  ];
  const millsSoft = [
    "altra-industrial-motion",
    "fronius",
    "renishaw",
    "kabelwerk-eupen",
    "aquatherm",
    "bonnell-aluminum",
    "charlotte-pipe",
    "ipex",
    "iscar",
    "liqui-box",
    "novolex",
    "special-metals",
    "superior-essex",
    "vitro",
    "walsin-lihwa",
  ];
  const dayProductSlugs = [
    "rehau",
    "trumpf",
    "ati",
    "kaiser-aluminum",
    "victaulic",
    "altra-industrial-motion",
    "fronius",
    "renishaw",
    "kabelwerk-eupen",
  ];
  const holdOut = [
    "amada",
    "makino",
    "gf-piping-systems",
    "nipro-pharmapackaging",
    "commscope",
    "mitutoyo",
    "tsubaki",
    "johns-manville",
    "heidenhain",
    "miller-electric",
    "seco-tools",
    "jm-eagle",
    "rathgibson",
    "martin-sprocket",
    "tolomatic",
    "clippard",
  ];
  const dayMills = packSuppliers.filter((s) => s.pack === "daily-2026-09-17" && !s.productHostOnly);
  const dayHosts = packSuppliers.filter((s) => s.pack === "daily-2026-09-17" && s.productHostOnly);
  const dayProducts = packProducts.filter((p) => p.pack === "d0917");
  const softCaptions: Record<string, RegExp> = {
    "altra-industrial-motion": /OEM\/brand manufacturer group|not a single plant|Columbia City/i,
    fronius: /Sattledt|not a confirmed plant-exterior/i,
    renishaw: /New Mills|not a confirmed plant-exterior/i,
    "kabelwerk-eupen": /Eupen|chimney|not a confirmed plant-exterior/i,
    aquatherm: /Attendorn|unbranded|not a (clearly labeled|confirmed) /i,
    "bonnell-aluminum": /unbranded|not a confirmed plant-exterior/i,
    "charlotte-pipe": /Oakboro|no Charlotte Pipe branding/i,
    ipex: /unbranded|not a confirmed plant-exterior/i,
    iscar: /Tefen|no ISCAR|not a confirmed plant-exterior/i,
    "liqui-box": /unbranded|not a confirmed plant-exterior/i,
    novolex: /unbranded|plant interior|not a confirmed plant-exterior/i,
    "special-metals": /unbranded|not a confirmed plant-exterior/i,
    "superior-essex": /unbranded|not a confirmed plant-exterior/i,
    vitro: /unbranded|not a confirmed/i,
    "walsin-lihwa": /no Walsin Lihwa branding|not a confirmed plant-exterior/i,
  };

  it("appends the 34 cleared mills and 9 RFQ products without rewriting locked packs", () => {
    expect(dayMills.map((s) => s.packSlug).sort()).toEqual([...millsOk, ...millsSoft].sort());
    expect(dayProducts.map((p) => p.packSlug).sort()).toEqual([...dayProductSlugs].sort());
    expect(dayHosts).toEqual([]);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15" && !s.productHostOnly)).toHaveLength(8);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold39")).toHaveLength(32);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-hold7")).toHaveLength(6);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-15-anvil")).toHaveLength(1);
    expect(packProducts.filter((p) => p.pack === "d0915")).toHaveLength(17);
    expect(packProducts.filter((p) => p.pack === "d0915-h33")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0915-h5")).toHaveLength(5);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14" && !s.productHostOnly)).toHaveLength(16);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold33")).toHaveLength(29);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-14-hold4")).toHaveLength(4);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11" && !s.productHostOnly)).toHaveLength(9);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-skip12")).toHaveLength(11);
    expect(packSuppliers.filter((s) => s.pack === "daily-2026-09-11-rest30")).toHaveLength(30);
    expect(packProducts.filter((p) => p.pack === "d0914")).toHaveLength(28);
    expect(packProducts.filter((p) => p.pack === "d0914-h22")).toHaveLength(22);
    expect(packProducts.filter((p) => p.pack === "d0911")).toHaveLength(9);
  });

  it("points cards at local stills, keeps RFQ honesty, and skips invented certs", () => {
    const listed = new Set(mergePackSuppliers(outscraperSuppliers).map((s) => s.id));
    for (const s of dayMills) {
      if (s.packSlug === "altra-industrial-motion") {
        expect(s.imageUrl).toBe("/images/suppliers/altra-industrial-motion/altra-industrial-motion_02.jpg");
        expect(s.supplierImages).toEqual([
          "/images/suppliers/altra-industrial-motion/altra-industrial-motion_02.jpg",
        ]);
        expect(s.name).toMatch(/OEM|manufacturer group/i);
      } else {
        expect(s.imageUrl, s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
        expect(s.supplierImages?.[0], s.packSlug).toBe(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
        expect(s.supplierImages, s.packSlug).toContain(`/images/suppliers/${s.packSlug}/${s.packSlug}_01.jpg`);
      }
      expect((s.supplierImages ?? []).every((u) => u.startsWith("/images/suppliers/")), s.packSlug).toBe(true);
      expect(s.moq, s.packSlug).toMatch(/RFQ/i);
      expect(s.productHostOnly, s.packSlug).toBeFalsy();
      expect(s.certificationsDetailed ?? [], s.packSlug).toEqual([]);
      expect(listed.has(s.id), s.packSlug).toBe(true);
      expect(JSON.stringify(s), s.packSlug).not.toMatch(/\$0\.00|maps\.google|googleusercontent/i);
    }
    for (const p of dayProducts) {
      expect(p.basePrice, p.id).toBeNull();
      expect(p.priceSourceType, p.id).toBe("rfq");
      expect(p.status, p.id).toBe("approved");
      expect(p.images.length, p.id).toBeGreaterThan(0);
      expect(p.images.every((u) => u.startsWith(`/images/products/${p.packSlug}/`)), p.id).toBe(true);
      expect(JSON.stringify(p), p.id).not.toMatch(/\$0\.00|maps\.google|googleusercontent/i);
      expect(p.specifications["Image credit"] ?? "", p.id).not.toMatch(/AI-generated/i);
      expect(p.certifications ?? [], p.id).toEqual([]);
    }
  });

  it("soft-captions the SOFT 15, relabels Altra as a manufacturer group, and keeps HOLD/soft-hold out", () => {
    for (const slug of millsSoft) {
      const mill = dayMills.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).toMatch(softCaptions[slug]);
    }
    const altra = dayMills.find((s) => s.packSlug === "altra-industrial-motion");
    expect(altra).toBeDefined();
    expect(altra!.description).toMatch(/OEM\/brand manufacturer group|not a single plant/i);
    expect(altra!.description).not.toMatch(/single plant in Braintree/i);
    for (const slug of millsOk) {
      const mill = dayMills.find((s) => s.packSlug === slug);
      expect(mill, slug).toBeDefined();
      expect(mill!.description, slug).not.toMatch(
        /not a (confirmed )?plant-exterior|HQ campus|campus aerial|field-install|warehouse|mill interior/i
      );
    }
    const rehau = dayMills.find((s) => s.packSlug === "rehau");
    expect(rehau!.description).toMatch(/polymer pipe|building-technology piping/i);
    expect(rehau!.description).not.toMatch(/district of Hof|Fichtel Mountains/i);
    for (const slug of holdOut) {
      expect(dayMills.some((s) => s.packSlug === slug), slug).toBe(false);
      expect(dayProducts.some((p) => p.packSlug === slug), slug).toBe(false);
      expect(
        packSuppliers.some((s) => s.packSlug === slug && s.pack === "daily-2026-09-17"),
        slug
      ).toBe(false);
    }
    expect(packProducts.some((p) => p.packSlug === "iscar")).toBe(false);
    expect(dayMills.some((s) => s.packSlug === "iscar")).toBe(true);
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
