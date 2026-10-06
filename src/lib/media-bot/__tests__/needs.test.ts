// @vitest-environment node
import { describe, expect, it } from "vitest";
import { computeMediaNeeds, type MediaNeedsInput } from "../needs";

const input: MediaNeedsInput = {
  suppliers: [
    {
      id: "posco",
      name: "POSCO",
      website: "https://www.posco.com",
      category: "Steel & Metals",
      hasLegacyLogo: false,
      legacyPhotoCount: 1,
      certificates: [
        { name: "ISO 9001", hasScan: false },
        { name: "ISO 14001", hasScan: true },
      ],
    },
    { id: "boxco", name: "BoxCo", website: "https://boxco.example", category: "Packaging", hasLegacyLogo: true, legacyPhotoCount: 5, certificates: [] },
    { id: "nosite", name: "NoSite Steel", website: null, category: "Steel & Metals", hasLegacyLogo: false, legacyPhotoCount: 0, certificates: [] },
    { id: "storefront", name: "Storefront Steel", website: "https://storefront.en.alibaba.com", category: "Steel & Metals", hasLegacyLogo: false, legacyPhotoCount: 0, certificates: [] },
  ],
  products: [
    { id: "posco-hrc", name: "Hot-rolled coil", category: "Steel & Metals", supplierId: "posco", productUrl: null, sourceUrl: null, legacyImageCount: 0 },
    { id: "box-1", name: "Corrugated box", category: "Packaging", supplierId: "boxco", productUrl: "https://boxco.example/p/1", sourceUrl: null, legacyImageCount: 2 },
  ],
  providers: [
    { id: "falvey-cargo", name: "Falvey Cargo", urls: ["https://www.falveycargo.com/"] },
    { id: "has-logo", name: "Has Logo Insurer", urls: ["https://haslogo.example/"] },
  ],
  media: [
    { entityType: "SUPPLIER", entityId: "posco", mediaType: "SUPPLIER_FACTORY" },
    { entityType: "LOGISTICS_PROVIDER", entityId: "has-logo", mediaType: "PROVIDER_LOGO" },
  ],
};

describe("computeMediaNeeds", () => {
  it("lists what each metals entity is missing, with the domains to collect from", () => {
    const res = computeMediaNeeds(input, { industry: "metals" });
    expect(res.items).toEqual([
      {
        target: "supplier",
        entityId: "posco",
        name: "POSCO",
        industry: "metals",
        officialDomains: ["posco.com"],
        roles: ["logo", "factory", "gallery", "certificate"],
        certificates: ["ISO 9001"],
      },
      {
        target: "supplier",
        entityId: "storefront",
        name: "Storefront Steel",
        industry: "metals",
        officialDomains: [],
        roles: ["logo", "factory", "gallery"],
        alibabaStoreHost: "storefront.en.alibaba.com",
      },
      { target: "product", entityId: "posco-hrc", name: "Hot-rolled coil", industry: "metals", officialDomains: ["posco.com"], roles: ["product"] },
    ]);
    expect(res.withoutWebsite).toBe(1);
  });

  it("counts existing media (any status) as collected", () => {
    const res = computeMediaNeeds(input, { industry: "packaging" });
    expect(res.items).toEqual([]);
  });

  it("covers logistics providers under logistics-insurance only", () => {
    expect(computeMediaNeeds(input, { industry: "logistics-insurance" }).items.map((i) => i.entityId)).toEqual(["falvey-cargo"]);
    expect(computeMediaNeeds(input, { industry: "metals" }).items.some((i) => i.target === "logistics-provider")).toBe(false);
  });

  it("filters by target and pages", () => {
    const all = computeMediaNeeds(input, { industry: "all" });
    expect(all.total).toBe(4);
    expect(computeMediaNeeds(input, { industry: "all", target: "product" }).items.map((i) => i.entityId)).toEqual(["posco-hrc"]);
    const page = computeMediaNeeds(input, { industry: "all", offset: 1, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].entityId).toBe(all.items[1].entityId);
  });
});
