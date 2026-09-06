import { describe, expect, it } from "vitest";
import {
  detectPackFormat,
  parseImportPayload,
  parseListerPack,
  mergePacks,
  normalizeCategory,
  resolvePackImageUrl,
  normalizeCsvHeader,
} from "@/lib/import/pack-formats";

const listerSuppliers = {
  generated_at_utc: "2026-09-02T18:55:41Z",
  phase: "suplymate-phase1",
  task: "Daily expansion 2026-09-02",
  suppliers: [
    {
      company_name: "POSCO",
      primary_category: "Steel & Metals",
      country: "South Korea",
      city: "Pohang",
      website: "https://www.posco.com/",
      description: "POSCO is a South Korean steel manufacturer headquartered in Pohang.",
      product_lines: ["Hot-rolled coil", "Heavy plate"],
      certifications: [{ name: "ISO 9001 quality management", source: "https://www.posco.com/" }],
      moq: "Not published — mill RFQ",
      source_url: "https://en.wikipedia.org/wiki/POSCO",
      photo_urls: [
        "https://upload.wikimedia.org/wikipedia/commons/a/a9/GwangyangIronworks.jpg",
        "https://newsroom.posco.com/en/wp-content/uploads/2014/03/14-1024x576.jpg",
      ],
      local_images: ["/workspace/suppliers-phase1/daily/2026-09-02/images/suppliers/posco/05.jpg"],
      slug: "posco",
      export_markets: ["Asia"],
    },
    {
      company_name: "Al Gharbia Pipe Company LLC",
      primary_category: "Tube & Pipes",
      country: "United Arab Emirates",
      website: "https://algharbiapipe.com/",
      cert_image_urls: ["https://algharbiapipe.com/wp-content/uploads/2022/10/Certificate-5L-1170.png"],
      certifications: ["API 5L (5L-1170)"],
      photo_urls: ["https://algharbiapipe.com/mill.jpg", "https://algharbiapipe.com/wp-content/uploads/logo.png"],
    },
  ],
};

const listerProducts = {
  products: [
    {
      product_name: "POSCO Hot-Rolled Coil",
      product_slug: "posco-hot-rolled-coil",
      supplier_name: "POSCO",
      supplier_slug_guess: "posco",
      source_url: "https://www.posco.com/products/hrc",
      unit_price: null,
      currency: null,
      unit: null,
      price_note: "RFQ — mill quote only. Never invent prices.",
      price_source_type: "rfq",
      image_urls: ["https://www.posco.com/img/hrc.jpg"],
      needs_ai_generate: false,
    },
    {
      product_name: "Orphan Widget",
      supplier_name: "Unknown Mill Co",
      source_url: "https://unknown.example/widget",
      unit_price: 12.5,
      currency: "USD",
      unit: "piece",
      image_urls: [],
    },
  ],
};

describe("pack-formats: detection", () => {
  it("detects the Lister daily pack, SupplierBundle and CSV", () => {
    expect(detectPackFormat(listerSuppliers)).toBe("lister");
    expect(detectPackFormat(listerProducts)).toBe("lister");
    expect(detectPackFormat({ supplierName: "X", products: [] })).toBe("bundle");
    expect(detectPackFormat([{ supplierName: "X", products: [] }])).toBe("bundle");
    expect(detectPackFormat("name,country\nAcme,DE")).toBe("csv");
    expect(detectPackFormat({ foo: 1 })).toBeNull();
  });

  it("normalises category aliases used by the bot", () => {
    expect(normalizeCategory("Tube & Pipes")).toBe("Tubes & Pipes");
    expect(normalizeCategory("Steel & Metals")).toBe("Steel & Metals");
    expect(normalizeCategory("Something else")).toBeNull();
  });

  it("only resolves public image references", () => {
    expect(resolvePackImageUrl("https://a.example/x.jpg")).toBe("https://a.example/x.jpg");
    expect(resolvePackImageUrl("/workspace/suppliers-phase1/images/x.jpg", "https://suplymate.com")).toBeNull();
    expect(resolvePackImageUrl("/images/suppliers/posco/1.jpg", "https://suplymate.com")).toBe(
      "https://suplymate.com/images/suppliers/posco/1.jpg"
    );
    expect(resolvePackImageUrl("/images/suppliers/posco/1.jpg", null)).toBeNull();
  });
});

describe("pack-formats: Lister daily pack", () => {
  it("maps suppliers to PENDING SupplierInputs with photo + certification candidates", () => {
    const pack = parseListerPack(listerSuppliers);
    expect(pack.format).toBe("lister");
    expect(pack.generatedAt).toBe("2026-09-02T18:55:41Z");
    expect(pack.suppliers).toHaveLength(2);

    const posco = pack.suppliers[0];
    expect(posco.externalId).toBe("posco");
    expect(posco.input.name).toBe("POSCO");
    expect(posco.input.verificationStatus).toBe("pending");
    expect(posco.input.category).toBe("Steel & Metals");
    expect(posco.input.products).toEqual(["Hot-rolled coil", "Heavy plate"]);
    // VM-local paths are dropped, remote photos kept.
    expect(posco.photoUrls).toEqual([
      "https://upload.wikimedia.org/wikipedia/commons/a/a9/GwangyangIronworks.jpg",
      "https://newsroom.posco.com/en/wp-content/uploads/2014/03/14-1024x576.jpg",
    ]);
    expect(posco.certifications[0]).toMatchObject({ name: "ISO 9001 quality management", sourceUrl: "https://www.posco.com/" });

    const agp = pack.suppliers[1];
    expect(agp.externalId).toBe("al-gharbia-pipe-company-llc");
    expect(agp.input.category).toBe("Tubes & Pipes");
    expect(agp.certifications[0]).toMatchObject({
      name: "API 5L (5L-1170)",
      imageUrl: "https://algharbiapipe.com/wp-content/uploads/2022/10/Certificate-5L-1170.png",
    });
    expect(agp.input.certificationImages).toEqual([
      "https://algharbiapipe.com/wp-content/uploads/2022/10/Certificate-5L-1170.png",
    ]);
  });

  it("maps products, keeps RFQ prices null and links them to pack suppliers", () => {
    const merged = mergePacks([parseListerPack(listerSuppliers), parseListerPack(listerProducts)]);
    expect(merged.suppliers).toHaveLength(2);
    expect(merged.products).toHaveLength(2);

    const hrc = merged.products[0];
    expect(hrc.externalId).toBe("import-posco-posco-hot-rolled-coil");
    expect(hrc.supplierExternalId).toBe("posco");
    expect(hrc.price).toBeNull();
    expect(hrc.priceNote).toMatch(/RFQ/);
    expect(hrc.status).toBe("pending");
    expect(hrc.category).toBe("Steel & Metals");
    expect(hrc.imageUrls).toEqual(["https://www.posco.com/img/hrc.jpg"]);

    const orphan = merged.products[1];
    expect(orphan.supplierExternalId).toBe("unknown-mill-co");
    expect(orphan.price).toBe(12.5);
    expect(orphan.currency).toBe("USD");
  });

  it("accepts a JSON string payload and an array of products", () => {
    const pack = parseImportPayload(JSON.stringify(listerProducts.products));
    expect(pack.format).toBe("lister");
    expect(pack.products).toHaveLength(2);
  });
});

describe("pack-formats: SupplierBundle + CSV", () => {
  it("parses the existing SupplierBundle example shape", () => {
    const pack = parseImportPayload({
      supplierName: "MetalWorks China",
      logo: "https://cdn.example/logos/metalworks.png",
      bannerImage: "https://cdn.example/banners/metalworks.jpg",
      category: "Steel & Metals",
      country: "China",
      currency: "USD",
      moq: "5 tons",
      website: "https://example.com/metalworks-china",
      products: [{ name: "Steel Beam", image: "https://cdn.example/products/steelbeam.jpg", price: 120, category: "Steel & Metals" }],
    });
    expect(pack.format).toBe("bundle");
    expect(pack.suppliers[0].externalId).toBe("metalworks-china");
    expect(pack.suppliers[0].input.verificationStatus).toBe("pending");
    expect(pack.suppliers[0].logoUrl).toBe("https://cdn.example/logos/metalworks.png");
    expect(pack.products[0]).toMatchObject({
      externalId: "bundle-metalworks-china-steel-beam",
      price: 120,
      currency: "USD",
      imageUrls: ["https://cdn.example/products/steelbeam.jpg"],
      status: "pending",
    });
  });

  it("reports invalid bundles as warnings instead of throwing", () => {
    const pack = parseImportPayload([{ supplierName: "No products" }, { supplierName: "Ok", products: [{ name: "P", price: 1 }] }]);
    expect(pack.suppliers).toHaveLength(1);
    expect(pack.warnings[0]).toMatch(/bundles\[0\]/);
  });

  it("parses the supplier CSV and maps a phase-1 photoUrls column to images", () => {
    const csv =
      "name,category,country,website,photoUrls,certifications\n" +
      'Rhein Steel Werke GmbH,Steel & Metals,Germany,https://example-rheinsteel.com,"https://img.example/a.jpg|https://img.example/b.jpg",ISO 9001|CE\n';
    expect(normalizeCsvHeader(csv)).toMatch(/^name,category,country,website,images,certifications/);
    const pack = parseImportPayload(csv);
    expect(pack.format).toBe("csv");
    expect(pack.suppliers).toHaveLength(1);
    expect(pack.suppliers[0].photoUrls).toEqual(["https://img.example/a.jpg", "https://img.example/b.jpg"]);
    expect(pack.suppliers[0].certifications.map((c) => c.name)).toEqual(["ISO 9001", "CE"]);
    expect(pack.suppliers[0].input.verificationStatus).toBe("pending");
  });

  it("throws a clear error for unrecognised payloads", () => {
    expect(() => parseImportPayload({ hello: "world" })).toThrow(/Unrecognised import payload/);
    expect(() => parseImportPayload("{not json")).toThrow(/not valid JSON/);
  });
});
