import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getLogisticsProvider, LOGISTICS_PROVIDERS } from "@/data/logistics-providers";
import {
  DROPPED_PROVIDER_LOGO_IDS,
  PROVIDER_LOGOS,
  getProviderLogo,
  resolveProviderLogo,
} from "@/data/logistics-provider-logos";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const DARK_TILE_IDS = [
  "aig-ocean-cargo",
  "axa-xl-marine-cargo",
  "qbe-marine-cargo",
  "avalon-cargo-insurance",
];

describe("QA-approved logistics provider logos", () => {
  it("ships a logo for the 18 approved ids and none for the 3 drops", () => {
    expect(Object.keys(PROVIDER_LOGOS)).toHaveLength(18);
    expect(DROPPED_PROVIDER_LOGO_IDS).toHaveLength(3);

    for (const [id, asset] of Object.entries(PROVIDER_LOGOS)) {
      const provider = getLogisticsProvider(id);
      expect(provider, id).toBeDefined();
      expect(provider?.logo, id).toBe(asset.src);
      expect(getProviderLogo(id)?.src, id).toBe(asset.src);
      expect(resolveProviderLogo(provider!)?.src, id).toBe(asset.src);
      const file = path.join(PUBLIC_DIR, asset.src.replace(/^\//, ""));
      expect(fs.existsSync(file), file).toBe(true);
      if (asset.src.endsWith(".svg")) {
        expect(fs.readFileSync(file, "utf8"), id).toMatch(/<svg[\s>]/i);
      }
    }

    for (const id of DROPPED_PROVIDER_LOGO_IDS) {
      expect(getLogisticsProvider(id), id).toBeDefined();
      expect(getProviderLogo(id), id).toBeUndefined();
      expect(getLogisticsProvider(id)?.logo, id).toBeUndefined();
      expect(getLogisticsProvider(id)?.logoOnDark, id).toBeUndefined();
      expect(resolveProviderLogo({ id })).toBeNull();
      for (const ext of [".png", ".svg", ".webp", ".jpg", ".jpeg"]) {
        expect(fs.existsSync(path.join(PUBLIC_DIR, "logistics", "logos", `${id}${ext}`)), id).toBe(false);
      }
    }
  });

  it("puts only the four white logos on a dark tile and keeps AIG at its native 89px", () => {
    expect(Object.keys(PROVIDER_LOGOS).filter((id) => PROVIDER_LOGOS[id].logoOnDark).sort()).toEqual(
      [...DARK_TILE_IDS].sort(),
    );
    for (const id of DARK_TILE_IDS) {
      expect(getLogisticsProvider(id)?.logoOnDark, id).toBe(true);
    }
    expect(PROVIDER_LOGOS["aig-ocean-cargo"].maxNativePx).toBe(89);
    const aig = getLogisticsProvider("aig-ocean-cargo")!;
    expect(resolveProviderLogo(aig)?.maxNativePx).toBe(89);
    expect(resolveProviderLogo(aig, "https://blob.example/aig.png")).toEqual({
      src: "https://blob.example/aig.png",
      logoOnDark: true,
    });
  });

  it("does not invent logos for providers outside the approved set", () => {
    const approved = new Set(Object.keys(PROVIDER_LOGOS));
    const withLogo = LOGISTICS_PROVIDERS.filter((p) => p.logo);
    expect(withLogo.map((p) => p.id).sort()).toEqual([...approved].sort());
    expect(fs.readdirSync(path.join(PUBLIC_DIR, "logistics", "logos"))).toHaveLength(18);
  });
});
