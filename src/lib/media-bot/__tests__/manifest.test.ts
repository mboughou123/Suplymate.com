// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ENHANCEMENTS,
  MEDIA_ROLES,
  MEDIA_TARGETS,
  enhancementsForRole,
  looksLikeMediaManifest,
  parseMediaItem,
  parseMediaManifest,
  rolesForTarget,
  storageTarget,
} from "../manifest";
import { MEDIA_TYPES_BY_ENTITY } from "@/lib/media-types";

const base = {
  target: "supplier",
  entityId: "posco",
  role: "factory",
  file: "enhanced/supplier/posco/plant.jpg",
  sourceUrl: "https://www.posco.com/plant",
  enhancement: "restore",
};

function error(raw: unknown, requireFile = true): string | null {
  const res = parseMediaItem(raw, { requireFile });
  return "error" in res ? res.error : null;
}

describe("parseMediaItem", () => {
  it("accepts a well-formed item and normalises paths", () => {
    const res = parseMediaItem({ ...base, file: "./enhanced/supplier/posco/plant.jpg", sha256: "A".repeat(64) }, { requireFile: true });
    expect(res).toEqual({ item: { ...base, sha256: "a".repeat(64) } });
  });

  it("accepts a labelled AI product image and rejects it for every other role", () => {
    expect(error({ ...base, target: "product", role: "product", enhancement: "ai-generated", aiGenerated: true })).toBeNull();
    expect(error({ ...base, target: "product", role: "product", enhancement: "ai-generated" })).toMatch(/aiGenerated: true/);
    expect(error({ ...base, role: "logo", enhancement: "ai-generated", aiGenerated: true })).toMatch(/not allowed for logo/);
    expect(error({ ...base, role: "factory", enhancement: "ai-generated", aiGenerated: true })).toMatch(/not allowed for factory/);
    expect(error({ ...base, role: "cover", enhancement: "ai-generated", aiGenerated: true })).toMatch(/not allowed for cover/);
    expect(error({ ...base, role: "gallery", enhancement: "ai-generated", aiGenerated: true })).toMatch(/not allowed for gallery/);
    expect(
      error({ ...base, role: "certificate", enhancement: "ai-generated", aiGenerated: true, certification: { name: "ISO 9001" } }),
    ).toMatch(/not allowed for certificate/);
  });

  it("never accepts generative edits", () => {
    expect(error({ ...base, enhancement: "generative" })).toMatch(/generative edits are never accepted/);
    expect(error({ ...base, enhancement: "ai-redraw" })).toMatch(/not accepted/);
  });

  it("keeps logos and certificates to meaning-preserving edits", () => {
    expect(error({ ...base, role: "logo", enhancement: "upscale" })).toMatch(/not allowed for logo/);
    expect(error({ ...base, role: "logo", enhancement: "background-removed" })).toBeNull();
    expect(error({ ...base, role: "certificate", enhancement: "restore", certification: { name: "ISO 9001" } })).toMatch(/not allowed for certificate/);
  });

  it("checks role against target", () => {
    expect(error({ ...base, target: "logistics-provider", role: "factory" })).toMatch(/not valid for target/);
    expect(error({ ...base, target: "product", role: "product" })).toBeNull();
  });

  it("requires certification.name for supplier certificates and validates dates", () => {
    expect(error({ ...base, role: "certificate", enhancement: "none" })).toMatch(/certification.name/);
    expect(error({ ...base, role: "certificate", enhancement: "none", certification: { name: "ISO 9001", issueDate: "2025/01/01" } })).toMatch(/issueDate/);
    expect(error({ ...base, role: "certificate", enhancement: "none", certification: { name: "ISO 9001", issueDate: "2025-01-01" } })).toBeNull();
  });

  it("rejects paths outside enhanced/ and originals/, traversal and non-images", () => {
    expect(error({ ...base, file: "../etc/passwd.jpg" })).toMatch(/file must be/);
    expect(error({ ...base, file: "images/x.jpg" })).toMatch(/file must be/);
    expect(error({ ...base, file: "enhanced/x.exe" })).toMatch(/file must be/);
  });

  it("requires a file for pushes but accepts an original before prepare", () => {
    const { file: _file, ...rest } = base;
    void _file;
    expect(error({ ...rest, original: "originals/supplier/posco/plant.jpg" })).toMatch(/run `media-bot prepare`/);
    expect(error({ ...rest, original: "originals/supplier/posco/plant.jpg" }, false)).toBeNull();
  });

  it("requires an http(s) sourceUrl and a sane entityId", () => {
    expect(error({ ...base, sourceUrl: "javascript:alert(1)" })).toMatch(/sourceUrl/);
    expect(error({ ...base, entityId: "../../x" })).toMatch(/entityId/);
  });
});

describe("parseMediaManifest", () => {
  it("reports per-item errors without failing the batch", () => {
    const res = parseMediaManifest(JSON.stringify({ version: 1, bot: "lister", items: [base, { ...base, role: "nope" }] }), { requireFile: true });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.manifest).toEqual({ version: 1, bot: "lister" });
    expect(res.items.map((i) => Boolean(i.item))).toEqual([true, false]);
  });

  it("rejects unknown versions and oversize batches", () => {
    expect(parseMediaManifest({ version: 2, items: [] }, { requireFile: true }).ok).toBe(false);
    expect(parseMediaManifest({ version: 1, items: Array(501).fill(base) }, { requireFile: true }).ok).toBe(false);
  });

  it("is told apart from Image Enhancer [{src,dst}] manifests", () => {
    expect(looksLikeMediaManifest({ version: 1, items: [] })).toBe(true);
    expect(looksLikeMediaManifest([{ src: "a", dst: "b" }])).toBe(false);
  });
});

describe("storageTarget", () => {
  it("maps every allowed target/role to a media type that belongs to its entity type", () => {
    for (const target of MEDIA_TARGETS) {
      for (const role of rolesForTarget(target)) {
        const { entityType, mediaType } = storageTarget(target, role);
        expect(MEDIA_TYPES_BY_ENTITY[entityType]).toContain(mediaType);
      }
    }
    expect(storageTarget("logistics-provider", "logo")).toEqual({ entityType: "LOGISTICS_PROVIDER", mediaType: "PROVIDER_LOGO" });
    expect(storageTarget("supplier", "certificate")).toEqual({ entityType: "CERTIFICATION", mediaType: "CERTIFICATION" });
  });

  it("only allows known enhancements per role", () => {
    for (const role of MEDIA_ROLES) for (const e of enhancementsForRole(role)) expect(ENHANCEMENTS).toContain(e);
  });
});
