import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { toDirectorySupplier, getPackSupplier } from "@/data/pack-catalog";
import { SUPPLIER_OFFICIAL_LOGOS } from "@/data/supplier-official-logos";

const PUBLIC_DIR = path.join(process.cwd(), "public");

describe("official supplier logos", () => {
  it("points every mapped id at a real file and does not replace a catalogue logo", () => {
    const ids = Object.keys(SUPPLIER_OFFICIAL_LOGOS);
    expect(ids.length).toBeGreaterThan(100);

    for (const [id, asset] of Object.entries(SUPPLIER_OFFICIAL_LOGOS)) {
      expect(asset.src, id).toBe(`/logos/suppliers/${id}.${asset.src.endsWith(".svg") ? "svg" : "png"}`);
      const file = path.join(PUBLIC_DIR, asset.src.replace(/^\//, ""));
      expect(fs.existsSync(file), file).toBe(true);
      if (asset.src.endsWith(".svg")) {
        expect(fs.readFileSync(file, "utf8"), id).toMatch(/<svg[\s>]/i);
      }
      const pack = getPackSupplier(id);
      expect(pack, id).toBeDefined();
      expect(pack?.logoUrl, id).toBeFalsy();
      expect(toDirectorySupplier(pack!).logoUrl, id).toBe(asset.src);
    }
  });

  it("keeps raster logos at least 200px wide", async () => {
    const pngs = Object.values(SUPPLIER_OFFICIAL_LOGOS).filter((asset) => asset.src.endsWith(".png"));
    expect(pngs.length).toBeGreaterThan(50);
    for (const asset of pngs) {
      const file = path.join(PUBLIC_DIR, asset.src.replace(/^\//, ""));
      const meta = await sharp(file).metadata();
      expect(meta.width ?? 0, asset.src).toBeGreaterThanOrEqual(200);
    }
  });
});
