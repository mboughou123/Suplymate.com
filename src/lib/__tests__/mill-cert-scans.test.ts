import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import { getSupplierProfile } from "@/lib/supplier-profile";
import {
  CERT_GALLERY_BLOCKED_SLUGS,
  CERT_SUPPLIER_ID_BY_SLUG,
  EMSTEEL_VERIFY,
  isEmsteelSupplier,
  listAllMillCertScans,
  listMillCertScansForSupplier,
} from "@/lib/mill-cert-scans";

describe("mill certificate scans", () => {
  const scans = listAllMillCertScans();

  it("only includes mills that have real public JPGs", () => {
    expect(scans.length).toBeGreaterThan(50);
    for (const scan of scans) {
      expect(scan.publicPath.startsWith("/images/certs/")).toBe(true);
      expect(/^https?:\/\//i.test(scan.publicPath)).toBe(false);
      const abs = join(process.cwd(), "public", scan.publicPath.replace(/^\//, ""));
      expect(existsSync(abs), scan.publicPath).toBe(true);
      expect(CERT_SUPPLIER_ID_BY_SLUG[scan.supplierSlug]).toBe(scan.supplierId);
    }
  });

  it("never builds a gallery for Ferrite, APL Apollo, or EMSTEEL", () => {
    expect(CERT_GALLERY_BLOCKED_SLUGS.has("ferrite")).toBe(true);
    expect(CERT_GALLERY_BLOCKED_SLUGS.has("apl-apollo")).toBe(true);
    expect(CERT_GALLERY_BLOCKED_SLUGS.has("emsteel")).toBe(true);
    expect(
      listMillCertScansForSupplier("ferrite-structural-steels-pvt-ltd-panvel"),
    ).toEqual([]);
    expect(listMillCertScansForSupplier("apl-apollo-tubes-limited-in")).toEqual([]);
    expect(
      listMillCertScansForSupplier("emsteel-building-materials-pjsc-emsteel-ae"),
    ).toEqual([]);
    expect(scans.some((s) => s.supplierSlug === "ferrite")).toBe(false);
    expect(scans.some((s) => s.supplierSlug === "apl-apollo")).toBe(false);
    expect(scans.some((s) => s.supplierSlug === "emsteel")).toBe(false);
    expect(isEmsteelSupplier(EMSTEEL_VERIFY.supplierId)).toBe(true);
    expect(EMSTEEL_VERIFY.caresUrl).toMatch(/ukcares\.com/);
  });

  it("prefers Foliflex current ISO and drops the expired PCMS scan", () => {
    const foli = listMillCertScansForSupplier("foliflex-wires-cables-delhi");
    const paths = foli.map((c) => c.publicPath);
    expect(paths[0]).toBe("/images/certs/foliflex-cables/iso-9001.jpg");
    expect(paths.some((p) => /pcms-2018/i.test(p))).toBe(false);
    expect(paths).toContain("/images/certs/foliflex-cables/iso-9001-aap-2022.jpg");
  });

  it("wires Arabian Pipes and the original 12 mills that have scans", () => {
    expect(listMillCertScansForSupplier("arabian-pipes-company-sa").length).toBe(12);
    expect(
      listMillCertScansForSupplier("al-gharbia-pipe-company-llc-ae").length,
    ).toBeGreaterThanOrEqual(7);
    expect(
      listMillCertScansForSupplier("saudi-iron-and-steel-company-hadeed-sa")
        .length,
    ).toBeGreaterThanOrEqual(8);
    expect(listMillCertScansForSupplier("aj-steel-icad2-ae").length).toBeGreaterThan(
      0,
    );
  });

  it("wires the KEI + Hebei Huayang cert append (10 real scan JPGs)", () => {
    const kei = listMillCertScansForSupplier("kei-industries-limited-in");
    const huayang = listMillCertScansForSupplier(
      "hebei-huayang-steel-pipe-co-ltd-cn",
    );
    const keiPaths = kei.map((c) => c.publicPath);
    const huayangPaths = huayang.map((c) => c.publicPath);

    for (const rel of [
      "/images/certs/kei-industries/iso-17025-nabl-bhiwadi.jpg",
      "/images/certs/kei-industries/iatf-16949-loc.jpg",
      "/images/certs/kei-industries/ce-lvd-11200-2025.jpg",
    ]) {
      expect(keiPaths, rel).toContain(rel);
      expect(existsSync(join(process.cwd(), "public", rel.replace(/^\//, "")))).toBe(
        true,
      );
    }
    for (const rel of [
      "/images/certs/hebei-huayang-steel-pipe/ce.jpg",
      "/images/certs/hebei-huayang-steel-pipe/iso-9001.jpg",
      "/images/certs/hebei-huayang-steel-pipe/api-2b.jpg",
      "/images/certs/hebei-huayang-steel-pipe/iso-45001.jpg",
      "/images/certs/hebei-huayang-steel-pipe/en-1090.jpg",
      "/images/certs/hebei-huayang-steel-pipe/iso-14001.jpg",
      "/images/certs/hebei-huayang-steel-pipe/api-5l.jpg",
    ]) {
      expect(huayangPaths, rel).toContain(rel);
      expect(existsSync(join(process.cwd(), "public", rel.replace(/^\//, "")))).toBe(
        true,
      );
    }

    expect(kei.length).toBeGreaterThanOrEqual(8);
    expect(huayang.length).toBeGreaterThanOrEqual(8);
    expect(kei.find((c) => c.publicPath.endsWith("iso-17025-nabl-bhiwadi.jpg"))?.name).toMatch(
      /ISO 17025 NABL/i,
    );
    expect(kei.find((c) => c.publicPath.endsWith("ce-lvd-11200-2025.jpg"))?.name).toMatch(
      /CE LVD/i,
    );
    expect(huayang.find((c) => c.publicPath.endsWith("api-5l.jpg"))?.name).toBe("API 5L");
    expect(huayang.find((c) => c.publicPath.endsWith("api-2b.jpg"))?.name).toBe("API 2B");
  });

  it("does not invent ISO badges on not_found mill profiles", () => {
    const ferrite = phase1Suppliers.find(
      (s) => s.id === "ferrite-structural-steels-pvt-ltd-panvel",
    )!;
    expect(getSupplierProfile(ferrite).certifications).toEqual([]);

    const apl = phase1Suppliers.find((s) => s.id === "apl-apollo-tubes-limited-in")!;
    expect(getSupplierProfile(apl).certifications).toEqual([]);

    const gharbia = phase1Suppliers.find(
      (s) => s.id === "al-gharbia-pipe-company-llc-ae",
    )!;
    expect(getSupplierProfile(gharbia).certifications.length).toBeGreaterThanOrEqual(
      7,
    );
  });
});
