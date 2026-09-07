import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOME_SUPPLIERS_BAND,
  getSupplierBandHref,
} from "@/lib/home-suppliers-band";

describe("home suppliers band", () => {
  it("lists exactly four Amine-approved mills in order", () => {
    expect(HOME_SUPPLIERS_BAND.map((e) => e.key)).toEqual([
      "alGharbia",
      "emsteel",
      "ferrite",
      "foliflex",
    ]);
  });

  it("commits real photo assets under public/images/suppliers/band/", () => {
    for (const entry of HOME_SUPPLIERS_BAND) {
      const absolutePath = resolve(process.cwd(), "public", entry.image.replace(/^\//, ""));
      expect(existsSync(absolutePath), entry.image).toBe(true);
    }
  });

  it("links to supplier profiles when the mill exists in data", () => {
    expect(getSupplierBandHref(HOME_SUPPLIERS_BAND[0])).toBe(
      "/supplier/al-gharbia-pipe-company-llc-ae",
    );
    expect(getSupplierBandHref(HOME_SUPPLIERS_BAND[1])).toBe(
      "/supplier/emsteel-building-materials-pjsc-emsteel-ae",
    );
    expect(getSupplierBandHref(HOME_SUPPLIERS_BAND[2])).toBe(
      "/supplier/ferrite-structural-steels-pvt-ltd-panvel",
    );
    expect(getSupplierBandHref(HOME_SUPPLIERS_BAND[3])).toBe(
      "/supplier/foliflex-wires-cables-delhi",
    );
  });
});
