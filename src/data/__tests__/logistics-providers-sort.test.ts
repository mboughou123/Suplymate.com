import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LOGISTICS_PROVIDERS,
  featuredInsuranceProviders,
  isInsuranceProvider,
  providerCoverImage,
  providerHasLogo,
  sortProvidersLogoFirst,
  type LogisticsProviderKind,
} from "@/data/logistics-providers";

describe("sortProvidersLogoFirst", () => {
  it("moves providers without a logo to the end, keeping order within each group", () => {
    const list = [
      { id: "a" },
      { id: "b", logo: "/b.png" },
      { id: "c" },
      { id: "d" },
      { id: "e", logo: "/e.svg" },
    ];
    expect(sortProvidersLogoFirst(list, { d: "https://x.public.blob.vercel-storage.com/d.png" }).map((p) => p.id)).toEqual([
      "b",
      "d",
      "e",
      "a",
      "c",
    ]);
  });

  it("does not mutate its input", () => {
    const list = [{ id: "a" }, { id: "b", logo: "/b.png" }];
    sortProvidersLogoFirst(list);
    expect(list.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("orders the real directory with every logo before every initials badge", () => {
    const sorted = sortProvidersLogoFirst(LOGISTICS_PROVIDERS);
    const flags = sorted.map((p) => providerHasLogo(p));
    expect(flags.indexOf(false)).toBeGreaterThan(0);
    expect(flags.slice(flags.indexOf(false))).not.toContain(true);
  });
});

describe("featuredInsuranceProviders", () => {
  it("returns up to six insurers, logo-first", () => {
    const picks = featuredInsuranceProviders();
    expect(picks.length).toBeLessThanOrEqual(6);
    expect(picks.length).toBeGreaterThan(0);
    for (const p of picks) {
      expect(isInsuranceProvider(p)).toBe(true);
      expect(providerHasLogo(p)).toBe(true);
    }
  });
});

describe("providerCoverImage", () => {
  const kinds: LogisticsProviderKind[] = [
    "cargo-insurer",
    "specialist-cargo-insurer",
    "cargo-insurance-broker",
    "freight-forwarder",
    "customs-broker",
  ];

  it("maps every kind to a bundled cover file", () => {
    for (const kind of kinds) {
      const { src } = providerCoverImage({ id: `x-${kind}`, kind });
      expect(src).toMatch(/^\/logistics\/covers\/.+\.webp$/);
      expect(existsSync(resolve(process.cwd(), "public", src.slice(1))), src).toBe(true);
    }
  });

  it("keeps scenes on-theme for the kind and stable per provider", () => {
    expect(providerCoverImage({ id: "a", kind: "customs-broker" }).scene).toBe("containers");
    expect(["warehouse", "air"]).toContain(providerCoverImage({ id: "a", kind: "freight-forwarder" }).scene);
    for (const p of LOGISTICS_PROVIDERS.filter((x) => x.kind === "cargo-insurer")) {
      expect(["port", "sea", "air"]).toContain(providerCoverImage(p).scene);
      expect(providerCoverImage(p)).toEqual(providerCoverImage(p));
    }
  });

  it("varies insurer covers across the directory", () => {
    const scenes = new Set(LOGISTICS_PROVIDERS.filter(isInsuranceProvider).map((p) => providerCoverImage(p).scene));
    expect(scenes.size).toBeGreaterThan(1);
  });
});
