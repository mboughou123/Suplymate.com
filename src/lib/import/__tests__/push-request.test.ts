// @vitest-environment node
// (jsdom FormData/Blob globals do not interoperate with undici Request bodies)
import { describe, expect, it } from "vitest";
import { decodeDataUrl, hasPackContent, parsePushRequest, pushMaxBytes, DEFAULT_PUSH_MAX_BYTES } from "@/lib/import/push-request";
import { PackFiles, candidatePaths, toPackRelative, packFileRef, isIngestableRef } from "@/lib/import/pack-files";
import { parseImportPayload, resolvePackImageUrl } from "@/lib/import/pack-formats";

// Smallest valid JPEG header (enough for the magic-byte sniffer).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

function multipart(fields: Record<string, string | { data: Buffer | string; name: string; type?: string }>, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string") form.set(k, v);
    else form.append(k, new Blob([typeof v.data === "string" ? v.data : new Uint8Array(v.data)], { type: v.type ?? "application/octet-stream" }), v.name);
  }
  return new Request("http://localhost/api/admin/import/run", { method: "POST", body: form, headers });
}

describe("pack-files", () => {
  it("normalises Grok-machine paths to pack-relative paths", () => {
    expect(toPackRelative("/workspace/suppliers-phase1/daily/2026-09-02/images/suppliers/posco/05.jpg")).toBe("images/suppliers/posco/05.jpg");
    expect(toPackRelative("/workspace/suppliers-phase1/daily/2026-09-02/enhanced/products/amcor/a.jpg")).toBe("enhanced/products/amcor/a.jpg");
    expect(toPackRelative("./enhanced/x.jpg")).toBe("enhanced/x.jpg");
    expect(toPackRelative("C:\\packs\\daily\\2026-09-02\\enhanced\\x.jpg")).toBe("enhanced/x.jpg");
    expect(toPackRelative("/some/other/root/images/certs/iso.png")).toBe("images/certs/iso.png");
    expect(toPackRelative("enhanced/../../etc/passwd")).toBeNull();
    expect(toPackRelative("https://example.com/a.jpg")).toBeNull();
  });

  it("prefers the enhanced still (manifest first) and falls back to the original", () => {
    expect(candidatePaths("images/suppliers/posco/05.jpg")).toEqual(["enhanced/suppliers/posco/05.jpg", "images/suppliers/posco/05.jpg"]);
    const manifest = new Map([["images/suppliers/posco/05.png", "enhanced/suppliers/posco/05-png.jpg"]]);
    expect(candidatePaths("images/suppliers/posco/05.png", manifest)[0]).toBe("enhanced/suppliers/posco/05-png.jpg");
    expect(candidatePaths("enhanced/a.jpg")).toEqual(["enhanced/a.jpg", "images/a.jpg"]);
  });

  it("PackFiles resolves refs through uploads + manifest and flags pre-enhanced bytes", () => {
    const files = new PackFiles();
    expect(files.add("/workspace/suppliers-phase1/daily/2026-09-02/enhanced/suppliers/posco/05.jpg", JPEG)).toBe("enhanced/suppliers/posco/05.jpg");
    files.add("images/suppliers/posco/06.jpg", JPEG);
    files.add("enhanced/suppliers/posco/07-png.jpg", JPEG);
    files.addManifest([{ src: "/workspace/suppliers-phase1/daily/2026-09-02/images/suppliers/posco/07.png", dst: "/workspace/suppliers-phase1/daily/2026-09-02/enhanced/suppliers/posco/07-png.jpg" }]);

    const a = files.resolve(packFileRef("images/suppliers/posco/05.jpg"));
    expect(a?.file.path).toBe("enhanced/suppliers/posco/05.jpg");
    expect(a?.preEnhanced).toBe(true);
    const b = files.resolve("packfile:images/suppliers/posco/06.jpg");
    expect(b?.file.path).toBe("images/suppliers/posco/06.jpg");
    expect(b?.preEnhanced).toBe(false);
    const c = files.resolve("packfile:images/suppliers/posco/07.png");
    expect(c?.file.path).toBe("enhanced/suppliers/posco/07-png.jpg");
    expect(files.resolve("packfile:images/suppliers/posco/missing.jpg")).toBeNull();
    expect(files.size).toBe(3);
    expect(files.totalBytes).toBe(JPEG.length * 3);
  });

  it("isIngestableRef accepts http(s) and packfile refs only", () => {
    expect(isIngestableRef("https://a.b/c.jpg")).toBe(true);
    expect(isIngestableRef("packfile:enhanced/a.jpg")).toBe(true);
    expect(isIngestableRef("/workspace/x.jpg")).toBe(false);
    expect(isIngestableRef(null)).toBe(false);
  });
});

describe("pack-formats: localFiles mode", () => {
  it("turns VM paths into packfile refs only when localFiles is on", () => {
    const vm = "/workspace/suppliers-phase1/daily/2026-09-02/images/suppliers/posco/05.jpg";
    expect(resolvePackImageUrl(vm)).toBeNull();
    expect(resolvePackImageUrl(vm, null, true)).toBe("packfile:images/suppliers/posco/05.jpg");
    expect(resolvePackImageUrl("enhanced/products/a/b.jpg", null, true)).toBe("packfile:enhanced/products/a/b.jpg");
    expect(resolvePackImageUrl("https://x.y/z.jpg", null, true)).toBe("https://x.y/z.jpg");
  });

  it("puts uploaded stills first in the supplier photo list", () => {
    const pack = parseImportPayload(
      {
        suppliers: [
          {
            company_name: "POSCO",
            photo_urls: ["https://newsroom.posco.com/14.jpg"],
            local_images: ["/workspace/suppliers-phase1/daily/2026-09-02/images/suppliers/posco/05.jpg"],
            certifications: [{ name: "ISO 9001", local_image: "/workspace/suppliers-phase1/daily/2026-09-02/images/certs/posco-iso.jpg" }],
          },
        ],
      },
      { localFiles: true }
    );
    expect(pack.suppliers[0].photoUrls).toEqual(["packfile:images/suppliers/posco/05.jpg", "https://newsroom.posco.com/14.jpg"]);
    expect(pack.suppliers[0].certifications[0].imageUrl).toBe("packfile:images/certs/posco-iso.jpg");
  });
});

describe("parsePushRequest: multipart", () => {
  it("parses day/part/of, JSON files, seal, manifests, options and image parts keyed by pack path", async () => {
    const req = multipart({
      day: "2026-09-02",
      part: "2",
      of: "3",
      seal: { data: JSON.stringify({ day: "2026-09-02", researcherOk: true }), name: "seal.json", type: "application/json" },
      "suppliers.json": { data: '{"suppliers":[{"company_name":"POSCO"}]}', name: "suppliers.json", type: "application/json" },
      "products.json": { data: '{"products":[]}', name: "products.json", type: "application/json" },
      manifest: { data: '[{"src":"images/suppliers/posco/05.png","dst":"enhanced/suppliers/posco/05-png.jpg"}]', name: "daily-manifest.json" },
      options: '{"dryRun":true,"limit":"7"}',
      "enhanced/suppliers/posco/05-png.jpg": { data: JPEG, name: "05-png.jpg", type: "image/jpeg" },
      "/workspace/suppliers-phase1/daily/2026-09-02/enhanced/suppliers/posco/06.jpg": { data: JPEG, name: "06.jpg", type: "image/jpeg" },
    });
    const res = await parsePushRequest(req);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = res.payload;
    expect(p.encoding).toBe("multipart");
    expect(p.day).toBe("2026-09-02");
    expect(p.part).toBe(2);
    expect(p.of).toBe(3);
    expect(typeof p.seal).toBe("string");
    expect(p.suppliersText).toContain("POSCO");
    expect(p.productsText).toBe('{"products":[]}');
    expect(p.manifests).toHaveLength(1);
    expect(p.options).toEqual({ dryRun: true, limit: "7" });
    expect(p.files.paths().sort()).toEqual(["enhanced/suppliers/posco/05-png.jpg", "enhanced/suppliers/posco/06.jpg"]);
    expect(hasPackContent(p)).toBe(true);
    for (const m of p.manifests) p.files.addManifest(m);
    expect(p.files.resolve("packfile:images/suppliers/posco/05.png")?.file.path).toBe("enhanced/suppliers/posco/05-png.jpg");
  });

  it("rejects part > of and bad days with 400", async () => {
    const bad = await parsePushRequest(multipart({ day: "2026-09-02", part: "4", of: "3" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.status).toBe(400);
    const badDay = await parsePushRequest(multipart({ day: "yesterday" }));
    expect(badDay.ok).toBe(false);
    if (!badDay.ok) expect(badDay.status).toBe(400);
  });

  it("returns 413 when the declared content-length exceeds the cap", async () => {
    const req = new Request("http://localhost/api/admin/import/run", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(10_000_000) },
      body: "--x--",
    });
    const res = await parsePushRequest(req, { maxBytes: 4_000_000 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(413);
      expect(res.error).toMatch(/at most 4000000 bytes/);
    }
  });

  it("returns 413 when the summed part sizes exceed the cap (no content-length)", async () => {
    const big = Buffer.alloc(3000, 0xff);
    big[0] = 0xff;
    big[1] = 0xd8;
    big[2] = 0xff;
    const req = multipart({
      day: "2026-09-02",
      "enhanced/a.jpg": { data: big, name: "a.jpg", type: "image/jpeg" },
      "enhanced/b.jpg": { data: big, name: "b.jpg", type: "image/jpeg" },
    });
    // FormData bodies are streamed by undici without a content-length header.
    req.headers.delete("content-length");
    const res = await parsePushRequest(req, { maxBytes: 4000 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(413);
  });

  it("rejects unsupported content types with 415", async () => {
    const req = new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "a=b" });
    const res = await parsePushRequest(req);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(415);
  });
});

describe("parsePushRequest: JSON", () => {
  it("accepts inline pack objects/strings, a seal and data: URL files", async () => {
    const body = {
      day: "2026-09-02",
      seal: { day: "2026-09-02", researcherOk: true },
      suppliers: '{"suppliers":[{"company_name":"POSCO"}]}',
      products: { products: [{ product_name: "Coil", supplier_name: "POSCO" }] },
      files: {
        "enhanced/suppliers/posco/05.jpg": `data:image/jpeg;base64,${JPEG.toString("base64")}`,
        "enhanced/bad.jpg": "not-a-data-url",
      },
      dryRun: true,
      limit: 3,
    };
    const req = new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const res = await parsePushRequest(req);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const p = res.payload;
    expect(p.encoding).toBe("json");
    expect(p.day).toBe("2026-09-02");
    expect(p.suppliersText).toContain("POSCO");
    expect(p.productsObj).toMatchObject({ products: [{ product_name: "Coil" }] });
    expect(p.files.paths()).toEqual(["enhanced/suppliers/posco/05.jpg"]);
    expect(p.files.resolve("packfile:images/suppliers/posco/05.jpg")?.file.buffer.equals(JPEG)).toBe(true);
    expect(p.warnings[0]).toMatch(/not a data: URL/);
    expect(p.options).toEqual({ dryRun: true, limit: 3 });
  });

  it("legacy body { pack } still parses and an empty body is a valid env-fallback trigger", async () => {
    const legacy = await parsePushRequest(new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pack: { suppliers: [] } }) }));
    expect(legacy.ok && legacy.payload.pack).toBeTruthy();
    const empty = await parsePushRequest(new Request("http://localhost/x", { method: "POST", headers: { "content-type": "application/json" } }));
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(hasPackContent(empty.payload)).toBe(false);
  });

  it("decodeDataUrl handles base64 and percent-encoded payloads", () => {
    expect(decodeDataUrl(`data:image/png;base64,${Buffer.from("abc").toString("base64")}`)?.buffer.toString()).toBe("abc");
    expect(decodeDataUrl("data:text/plain,hello%20world")?.buffer.toString()).toBe("hello world");
    expect(decodeDataUrl("https://x")).toBeNull();
  });

  it("pushMaxBytes reads IMPORT_PUSH_MAX_BYTES with a sane default", () => {
    expect(pushMaxBytes({} as unknown as NodeJS.ProcessEnv)).toBe(DEFAULT_PUSH_MAX_BYTES);
    expect(pushMaxBytes({ IMPORT_PUSH_MAX_BYTES: "1000" } as unknown as NodeJS.ProcessEnv)).toBe(1000);
    expect(pushMaxBytes({ IMPORT_PUSH_MAX_BYTES: "nope" } as unknown as NodeJS.ProcessEnv)).toBe(DEFAULT_PUSH_MAX_BYTES);
  });
});
