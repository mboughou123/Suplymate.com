import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CERT_GALLERY_BLOCKED_SLUGS,
  CERT_SUPPLIER_ID_BY_SLUG,
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
});
