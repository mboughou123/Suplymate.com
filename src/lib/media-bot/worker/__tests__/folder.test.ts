// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { parsePushRequest } from "@/lib/import/push-request";
import { looksLikeMediaManifest, type MediaManifest } from "../../manifest";
import { runMediaPush } from "../../push";
import { fakeDeps } from "../../__tests__/fake-deps";
import { FileAiCache } from "../ai-cache";
import { PREPARED_MANIFEST_FILENAME, PREPARE_REPORT_FILENAME, PUSH_RESULT_FILENAME, domainsFromNeeds, planMediaChunks, prepareFolder, pushFolder } from "../folder";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

async function writeImage(dir: string, rel: string, width: number, height: number, format: "jpeg" | "png" = "jpeg") {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  const img = sharp({ create: { width, height, channels: 3, background: { r: 30, g: 90, b: 150 } } });
  writeFileSync(abs, await (format === "png" ? img.png() : img.jpeg()).toBuffer());
}

async function makeFolder() {
  const dir = mkdtempSync(join(tmpdir(), "media-bot-folder-"));
  dirs.push(dir);
  await writeImage(dir, "originals/supplier/posco/logo.png", 600, 200, "png");
  await writeImage(dir, "originals/supplier/posco/plant.jpg", 1600, 1000);
  await writeImage(dir, "originals/product/posco-hrc/coil.jpg", 500, 400);
  await writeImage(dir, "originals/supplier/posco/from-alibaba.jpg", 800, 600);
  const manifest = {
    version: 1,
    bot: "image-enhancer",
    industry: "metals",
    items: [
      { target: "supplier", entityId: "posco", role: "logo", original: "originals/supplier/posco/logo.png", sourceUrl: "https://www.posco.com/" },
      { target: "supplier", entityId: "posco", role: "factory", original: "originals/supplier/posco/plant.jpg", sourceUrl: "https://newsroom.posco.com/plant" },
      { target: "product", entityId: "posco-hrc", role: "product", original: "originals/product/posco-hrc/coil.jpg", sourceUrl: "https://www.posco.com/products/hrc" },
      { target: "supplier", entityId: "posco", role: "gallery", original: "originals/supplier/posco/from-alibaba.jpg", sourceUrl: "https://posco.en.alibaba.com/" },
      { target: "supplier", entityId: "posco", role: "gallery", original: "originals/supplier/posco/missing.jpg", sourceUrl: "https://www.posco.com/" },
      { target: "supplier", entityId: "posco", role: "gallery", original: "originals/supplier/posco/plant.jpg", sourceUrl: "https://posco-fan-blog.example/" },
      { target: "supplier", entityId: "posco", role: "logo", original: "originals/supplier/posco/logo.png", sourceUrl: "https://www.posco.com/", enhancement: "generative" },
    ],
  };
  writeFileSync(join(dir, "media-manifest.json"), JSON.stringify(manifest));
  return dir;
}

const needs = domainsFromNeeds([
  {
    items: [
      { target: "supplier", entityId: "posco", name: "POSCO", industry: "metals", officialDomains: ["posco.com"], roles: ["logo"] },
      { target: "product", entityId: "posco-hrc", name: "POSCO HRC", industry: "metals", officialDomains: ["posco.com"], roles: ["product"] },
    ],
  },
]);

/** A fetch that runs the server half in-process: real multipart parsing, fake storage. */
function inProcessServer(ctx = fakeDeps()) {
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const req = new Request(url, init);
    if (req.headers.get("authorization") !== "Bearer s3cret") return new Response("{}", { status: 401 });
    const parsed = await parsePushRequest(req, { maxBytes: 4_000_000 });
    if (!parsed.ok) return new Response(JSON.stringify({ error: parsed.error }), { status: parsed.status });
    const manifest = parsed.payload.manifests.find(looksLikeMediaManifest);
    const summary = await runMediaPush({ manifest, files: parsed.payload.files, actor: "grok-bot", deps: ctx.deps, dryRun: parsed.payload.options.dryRun === "true" });
    return new Response(JSON.stringify(summary), { status: 200 });
  });
  return { fetchImpl, ...ctx };
}

describe("prepareFolder", () => {
  it("enhances what may be pushed and holds back everything else with a reason", async () => {
    const dir = await makeFolder();
    const report = await prepareFolder({ dir, cache: new FileAiCache(null), ai: null, needs });
    expect(report.prepared).toBe(3);
    expect(report.held.map((h) => h.reason)).toEqual([
      expect.stringMatching(/marketplaces/),
      expect.stringMatching(/missing.jpg not found/),
      expect.stringMatching(/not on the entity's official website/),
      expect.stringMatching(/generative/),
    ]);
    const prepared = JSON.parse(readFileSync(join(dir, PREPARED_MANIFEST_FILENAME), "utf8")) as MediaManifest;
    expect(prepared.items.map((i) => [i.role, i.enhancement])).toEqual([
      ["logo", "resize"],
      ["factory", "restore"],
      ["product", "upscale"],
    ]);
    for (const item of prepared.items) {
      expect(item.file).toMatch(new RegExp(`^enhanced/${item.target}/${item.entityId}/`));
      expect(existsSync(join(dir, item.file!))).toBe(true);
      expect(item.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(existsSync(join(dir, PREPARE_REPORT_FILENAME))).toBe(true);
  });

  it("holds back images the local AI flags", async () => {
    const dir = await makeFolder();
    let call = 0;
    const verdicts = [
      { matchesRole: true, quality: 4, marketplaceWatermark: false },
      { matchesRole: true, quality: 4, marketplaceWatermark: true, notes: "Alibaba watermark bottom right" },
      { matchesRole: false, quality: 3, marketplaceWatermark: false },
    ];
    const fetchImpl = (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(verdicts[call++]) } }] }))) as typeof fetch;
    const report = await prepareFolder({ dir, cache: new FileAiCache(null), ai: { baseUrl: "http://ollama:11434/v1", model: "llama3.2-vision" }, needs, fetchImpl });
    expect(report.prepared).toBe(1);
    expect(report.held.slice(0, 2).map((h) => h.reason)).toEqual([expect.stringMatching(/marketplace watermark \(Alibaba watermark/), expect.stringMatching(/not a product/)]);
    const prepared = JSON.parse(readFileSync(join(dir, PREPARED_MANIFEST_FILENAME), "utf8")) as MediaManifest;
    expect(prepared.items[0].qa).toMatchObject({ model: "llama3.2-vision", quality: 4 });
  });
});

describe("pushFolder", () => {
  it("uploads in chunks, lands everything unpublished, and never re-uploads", async () => {
    const dir = await makeFolder();
    const cache = new FileAiCache(null);
    await prepareFolder({ dir, cache, ai: null, needs });
    const prepared = JSON.parse(readFileSync(join(dir, PREPARED_MANIFEST_FILENAME), "utf8")) as MediaManifest;
    const biggest = Math.max(...prepared.items.map((i) => statSync(join(dir, i.file!)).size));
    const chunkBytes = 64_000 + biggest + 1_600;

    const server = inProcessServer();
    const first = await pushFolder({ dir, baseUrl: "https://suplymate.test/", secret: "s3cret", cache, chunkBytes, fetchImpl: server.fetchImpl as unknown as typeof fetch });
    expect(first.ok).toBe(true);
    expect(first.endpoint).toBe("https://suplymate.test/api/admin/import/media");
    expect(first.parts.length).toBeGreaterThanOrEqual(2);
    expect(first.items.map((i) => i.status)).toEqual(["imported", "imported", "imported"]);
    expect(first.items.map((i) => i.manifestIndex).sort()).toEqual([0, 1, 2]);
    expect(server.state.media.map((m) => [m.entityType, m.mediaType, m.status])).toEqual([
      ["SUPPLIER", "SUPPLIER_LOGO", "unpublished"],
      ["SUPPLIER", "SUPPLIER_FACTORY", "unpublished"],
      ["PRODUCT", "PRODUCT_GALLERY", "unpublished"],
    ]);
    expect(existsSync(join(dir, PUSH_RESULT_FILENAME))).toBe(true);

    const calls = server.fetchImpl.mock.calls.length;
    const second = await pushFolder({ dir, baseUrl: "https://suplymate.test", secret: "s3cret", cache, fetchImpl: server.fetchImpl as unknown as typeof fetch });
    expect(second).toMatchObject({ ok: true, alreadyPushed: 3, parts: [] });
    expect(server.fetchImpl.mock.calls.length).toBe(calls);
  });

  it("stops on auth errors and reports failure", async () => {
    const dir = await makeFolder();
    const cache = new FileAiCache(null);
    await prepareFolder({ dir, cache, ai: null, needs });
    const server = inProcessServer();
    const res = await pushFolder({ dir, baseUrl: "https://suplymate.test", secret: "wrong", cache, chunkBytes: 200_000, fetchImpl: server.fetchImpl as unknown as typeof fetch });
    expect(res.ok).toBe(false);
    expect(res.parts).toHaveLength(1);
    expect(res.parts[0].status).toBe(401);
    expect(server.state.media).toHaveLength(0);
  });

  it("dry-runs without touching the cache or writing push-result.json", async () => {
    const dir = await makeFolder();
    const cache = new FileAiCache(null);
    await prepareFolder({ dir, cache, ai: null, needs });
    const server = inProcessServer();
    const res = await pushFolder({ dir, baseUrl: "https://suplymate.test", secret: "s3cret", cache, dryRun: true, fetchImpl: server.fetchImpl as unknown as typeof fetch });
    expect(res.items.every((i) => i.status === "would-import")).toBe(true);
    expect(existsSync(join(dir, PUSH_RESULT_FILENAME))).toBe(false);
    expect(server.state.media).toHaveLength(0);
  });
});

describe("planMediaChunks", () => {
  it("skips files larger than one request", async () => {
    const dir = await makeFolder();
    await prepareFolder({ dir, cache: new FileAiCache(null), ai: null, needs });
    const prepared = JSON.parse(readFileSync(join(dir, PREPARED_MANIFEST_FILENAME), "utf8")) as MediaManifest;
    const { chunks, tooLarge } = planMediaChunks(dir, prepared.items, 64_500);
    expect(chunks).toEqual([]);
    expect(tooLarge).toEqual([0, 1, 2]);
  });
});
