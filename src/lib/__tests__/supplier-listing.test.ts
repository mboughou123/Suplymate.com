import { describe, expect, it } from "vitest";
import { packSuppliers } from "@/data/pack-catalog";
import { toDirectorySupplier } from "@/data/pack-catalog";
import {
  listingSupplierMatches,
  toListingSupplier,
} from "@/lib/supplier-listing";

describe("toListingSupplier", () => {
  const packRows = packSuppliers
    .filter((s) => !s.productHostOnly)
    .map((s) => toDirectorySupplier(s));

  it("keeps every public pack mill so catalogue rows are not dropped", () => {
    const listed = packRows.map(toListingSupplier);
    expect(listed).toHaveLength(packRows.length);
    expect(listed.map((s) => s.id).sort()).toEqual(packRows.map((s) => s.id).sort());
  });

  it("strips profile-only fields that currently bloat /en/suppliers HTML", () => {
    const heavy = packRows.find((s) => (s.description?.length ?? 0) > 80);
    expect(heavy).toBeDefined();
    const listing = toListingSupplier(heavy!);
    expect(listing).not.toHaveProperty("description");
    expect(listing).not.toHaveProperty("address");
    expect(listing).not.toHaveProperty("openingHours");
    expect(listing).not.toHaveProperty("certificationImages");
    expect(listing).not.toHaveProperty("certificationsDetailed");
    expect(listing).not.toHaveProperty("phone");
    expect(listing).not.toHaveProperty("email");
    expect(listing).not.toHaveProperty("sourceUrl");
    expect(listing.supplierImages?.length ?? 0).toBeLessThanOrEqual(1);
    expect(listing.products.length).toBeLessThanOrEqual(3);
    expect((listing.featuredProducts ?? []).length).toBeLessThanOrEqual(3);
  });

  it("still matches search on name, category, location, description and products", () => {
    const row = packRows.find(
      (s) =>
        s.description &&
        s.products.length > 0 &&
        (s.category || s.industry) &&
        s.location
    );
    expect(row).toBeDefined();
    const listing = toListingSupplier(row!);
    expect(listingSupplierMatches(listing, row!.name.slice(0, 6))).toBe(true);
    expect(listingSupplierMatches(listing, (row!.category ?? row!.industry).slice(0, 5))).toBe(
      true
    );
    const productNeedle = row!.products[0]!.slice(0, 6);
    expect(listingSupplierMatches(listing, productNeedle)).toBe(true);
    const descNeedle = row!.description!.split(/\s+/).find((w) => w.length > 5);
    if (descNeedle) {
      expect(listingSupplierMatches(listing, descNeedle)).toBe(true);
    }
    expect(listingSupplierMatches(listing, "zz-no-such-mill-xyz")).toBe(false);
  });

  it("serializes far smaller than the full supplier objects shipped today", () => {
    const fullBytes = Buffer.byteLength(JSON.stringify(packRows));
    const slimBytes = Buffer.byteLength(JSON.stringify(packRows.map(toListingSupplier)));
    expect(fullBytes).toBeGreaterThan(200_000);
    expect(slimBytes).toBeLessThan(fullBytes * 0.7);
    expect(slimBytes).toBeLessThan(380_000);
  });
});
