import { describe, expect, it } from "vitest";
import { applyHolds, recordHoldReason } from "@/lib/import/hold";
import { mergePacks, parseImportPayload } from "@/lib/import/pack-formats";
import { parseSeal } from "@/lib/import/seal-format";

// Records trimmed from data/daily-2026-09-03-suppliers.json / -products.json on
// the bot branch. The real files carry NO hold field — Bossard's soft-hold and
// the Jiuli / Ball QA holds only exist in the seal (or in the bot's site code),
// which is why the seal lists are the primary signal here.
const suppliers09_03 = {
  suppliers: [
    { company_name: "Bossard Group", primary_category: "Hardware & Motion", country: "Switzerland", slug: "bossard", local_images: ["/workspace/suppliers-phase1/daily/2026-09-03/images/suppliers/bossard/bossard_01.jpg"] },
    { company_name: "THK Co., Ltd.", primary_category: "Hardware & Motion", country: "Japan", slug: "thk", local_images: ["/workspace/suppliers-phase1/daily/2026-09-03/images/suppliers/thk/thk_01.jpg"] },
    { company_name: "Zhejiang Jiuli Hi-Tech Metals", primary_category: "Tube & Pipes", country: "China", slug: "jiuli" },
    { company_name: "Ball Corporation", primary_category: "Packaging", country: "United States", slug: "ball" },
  ],
};
const products09_03 = {
  products: [
    { product_name: "Ball Aluminum Aerosol Cans", supplier_name: "Ball Corporation", supplier_slug_guess: "ball", category: "Packaging", unit_price: null },
    { product_name: "Ball Aluminum Beverage Cans", supplier_name: "Ball Corporation", supplier_slug_guess: "ball", category: "Packaging", unit_price: null },
    { product_name: "Jiuli Seamless Stainless Tubes", supplier_name: "Zhejiang Jiuli Hi-Tech Metals", supplier_slug_guess: "jiuli", category: "Tube & Pipes", unit_price: null },
    { product_name: "THK LM Guide", supplier_name: "THK Co., Ltd.", supplier_slug_guess: "thk", category: "Hardware & Motion", unit_price: null },
    { product_name: "Bossard ecosyn-lubric Fasteners", supplier_name: "Bossard Group", supplier_slug_guess: "bossard", category: "Hardware & Motion", unit_price: null },
    // Attaches to an existing 2026-09-02 mill that is not in this suppliers.json.
    { product_name: "POSCO Hot-Rolled Coil", supplier_name: "POSCO", supplier_slug_guess: "posco", category: "Steel & Metals", unit_price: null },
  ],
};

const pack = (s: unknown = suppliers09_03, p: unknown = products09_03) =>
  mergePacks([parseImportPayload(s, { label: "suppliers.json", localFiles: true }), parseImportPayload(p, { label: "products.json", localFiles: true })], "2026-09-03");

describe("applyHolds", () => {
  it("no seal / no lists → everything passes, nothing held", () => {
    const r = applyHolds(pack(), null);
    expect(r.held).toEqual([]);
    expect(r.pack.suppliers).toHaveLength(4);
    expect(r.pack.products).toHaveLength(6);

    const bare = parseSeal({ day: "2026-09-03", researcherOk: true })!;
    expect(applyHolds(pack(), bare).held).toEqual([]);
  });

  it("seal hold list: soft-hold supplier (Bossard) and `supplier|product` QA keys", () => {
    const seal = parseSeal({
      day: "2026-09-03",
      researcherOk: true,
      softHold: { bossard: "distributor/logistics identity, not a producing mill" },
      qa_holds: ["ball|ball-aluminum-aerosol-cans"],
    })!;
    const r = applyHolds(pack(), seal);
    expect(r.pack.suppliers.map((s) => s.externalId)).toEqual(["thk", "jiuli", "ball"]);
    expect(r.pack.products.map((p) => p.slug)).toEqual(["ball-aluminum-beverage-cans", "jiuli-seamless-stainless-tubes", "thk-lm-guide", "posco-hot-rolled-coil"]);
    expect(r.held).toEqual([
      expect.objectContaining({ kind: "supplier", id: "bossard", name: "Bossard Group", reason: "distributor/logistics identity, not a producing mill", source: "seal", products: 1 }),
      expect.objectContaining({ kind: "product", key: "ball|ball-aluminum-aerosol-cans", reason: "hold", source: "seal" }),
      expect.objectContaining({ kind: "product", name: "Bossard ecosyn-lubric Fasteners", source: "supplier" }),
    ]);
  });

  it("a bare supplier slug in the hold list holds every SKU of that mill (Jiuli)", () => {
    const seal = parseSeal({ day: "2026-09-03", researcherOk: true, hold: ["jiuli"] })!;
    const r = applyHolds(pack(), seal);
    expect(r.pack.suppliers.some((s) => s.externalId === "jiuli")).toBe(false);
    expect(r.pack.products.some((p) => p.supplierExternalId === "jiuli")).toBe(false);
    expect(r.held.find((h) => h.kind === "supplier")?.products).toBe(1);
  });

  it("mill-seal allowlist: only sealed suppliers (by slug or name) and their products import", () => {
    const seal = parseSeal({ day: "2026-09-03", researcherOk: true, mill_seal: ["THK Co., Ltd.", "ball", "posco"] })!;
    const r = applyHolds(pack(), seal);
    expect(r.pack.suppliers.map((s) => s.externalId)).toEqual(["thk", "ball"]);
    // POSCO is not in this pack's suppliers but IS in the allowlist → its product passes.
    expect(r.pack.products.map((p) => p.slug)).toEqual(["ball-aluminum-aerosol-cans", "ball-aluminum-beverage-cans", "thk-lm-guide", "posco-hot-rolled-coil"]);
    const heldSuppliers = r.held.filter((h) => h.kind === "supplier");
    expect(heldSuppliers.map((h) => [h.id, h.reason, h.source])).toEqual([
      ["bossard", "not in mill-seal allowlist", "allowlist"],
      ["jiuli", "not in mill-seal allowlist", "allowlist"],
    ]);
    expect(r.held.filter((h) => h.kind === "product").map((h) => h.name)).toEqual(["Jiuli Seamless Stainless Tubes", "Bossard ecosyn-lubric Fasteners"]);
  });

  it("allowlist + hold list combine; a product of an unlisted, absent supplier is held", () => {
    const seal = parseSeal({ day: "2026-09-03", researcherOk: true, sealed: ["thk", "ball", "jiuli"], hold: ["ball|ball-aluminum-aerosol-cans"] })!;
    const r = applyHolds(pack(), seal);
    expect(r.pack.products.map((p) => p.slug)).toEqual(["ball-aluminum-beverage-cans", "jiuli-seamless-stainless-tubes", "thk-lm-guide"]);
    expect(r.held.find((h) => h.name === "POSCO Hot-Rolled Coil")).toMatchObject({ reason: "supplier not in mill-seal allowlist", source: "allowlist" });
  });

  it("per-record flags in suppliers.json / products.json are honoured without a seal", () => {
    const flagged = pack(
      {
        suppliers: [
          { company_name: "Bossard Group", slug: "bossard", identity: "soft-hold" },
          { company_name: "Trader Co", slug: "trader-co", status: "HOLD" },
          { company_name: "Held Mill", slug: "held-mill", hold: true },
          { company_name: "Unsealed Mill", slug: "unsealed-mill", mill_seal: false },
          { company_name: "Good Mill", slug: "good-mill", status: "approved" },
        ],
      },
      {
        products: [
          { product_name: "Good Tube", supplier_name: "Good Mill", supplier_slug_guess: "good-mill" },
          { product_name: "QA Held Tube", supplier_name: "Good Mill", supplier_slug_guess: "good-mill", qa_status: "hold" },
          { product_name: "Trader Tube", supplier_name: "Trader Co", supplier_slug_guess: "trader-co" },
        ],
      }
    );
    const r = applyHolds(flagged, null);
    expect(r.pack.suppliers.map((s) => s.externalId)).toEqual(["good-mill"]);
    expect(r.pack.products.map((p) => p.name)).toEqual(["Good Tube"]);
    expect(r.held.filter((h) => h.kind === "supplier").map((h) => [h.id, h.reason])).toEqual([
      ["bossard", "identity: soft-hold"],
      ["trader-co", "status: HOLD"],
      ["held-mill", "hold"],
      ["unsealed-mill", "mill_seal: false"],
    ]);
    expect(r.held.find((h) => h.name === "QA Held Tube")).toMatchObject({ reason: "qa_status: hold", source: "record" });
    expect(r.held.find((h) => h.name === "Trader Tube")).toMatchObject({ source: "supplier" });
  });
});

describe("recordHoldReason", () => {
  it("reads the accepted flag names and ignores normal records", () => {
    expect(recordHoldReason({ company_name: "POSCO", status: "listed" })).toBeNull();
    expect(recordHoldReason({ description: "SeAh Steel Holdings is a holding company" })).toBeNull();
    expect(recordHoldReason({ hold: "identity unclear" })).toBe("hold: identity unclear");
    expect(recordHoldReason({ soft_hold: true })).toBe("soft-hold");
    expect(recordHoldReason({ status: "Soft-Hold" })).toBe("status: Soft-Hold");
    expect(recordHoldReason({ review_status: "rejected" })).toBe("review_status: rejected");
    expect(recordHoldReason({ excluded: true })).toBe("excluded");
    expect(recordHoldReason({ researcher_ok: false })).toBe("researcher_ok: false");
    expect(recordHoldReason({ hold_reason: "trader, not mill" })).toBe("hold: trader, not mill");
    expect(recordHoldReason({ hold: false, status: "approved" })).toBeNull();
  });
});
