// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rows, uploads } = vi.hoisted(() => ({ rows: { media: [] as Record<string, unknown>[], audit: [] as Record<string, unknown>[] }, uploads: [] as { prefix?: string; filename?: string; contentType?: string }[] }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    media: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `m${rows.media.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        rows.media.push(row);
        return row;
      },
      findMany: async () => rows.media,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const hit = rows.media.find((r) => r.id === where.id)!;
        Object.assign(hit, data);
        return hit;
      },
    },
    mediaAuditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        rows.audit.push(data);
        return data;
      },
      findMany: async () => rows.audit,
    },
  },
}));

vi.mock("@/lib/image-storage", () => ({
  detectStorageProvider: () => "vercel-blob",
  storageProviderStatus: () => ({ provider: "vercel-blob", configured: true }),
  uploadBuffer: vi.fn(async (_buf: Buffer, opts: { prefix?: string; filename?: string; contentType?: string }) => {
    uploads.push(opts);
    const key = `${opts.prefix ?? "media"}/${opts.filename ?? "file"}`;
    return { url: `https://blob.example/${key}`, storageKey: key, provider: "vercel-blob" };
  }),
  deleteFromStorage: vi.fn(async () => true),
  persistProductImage: vi.fn(async (u: string) => u),
}));

import { ingestRemoteImage, PRE_ENHANCED_PROVIDER } from "@/lib/import/media-ingest";
import { PackFiles } from "@/lib/import/pack-files";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

beforeEach(() => {
  rows.media.length = 0;
  rows.audit.length = 0;
  uploads.length = 0;
  vi.stubEnv("IMAGE_ENHANCER_URL", "");
  vi.stubEnv("IMAGE_ENHANCE_WITH_OPENAI", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("ingestRemoteImage: bytes source (packfile: refs)", () => {
  it("stores an uploaded enhanced still under the enhanced/ prefix, without running an enhancer, and logs it as pre-enhanced", async () => {
    const files = new PackFiles();
    files.add("enhanced/suppliers/posco/05.jpg", JPEG, { filename: "05.jpg", contentType: "image/jpeg" });
    const existing = new Set<string>();

    const r = await ingestRemoteImage({
      url: "packfile:images/suppliers/posco/05.jpg",
      files,
      entityType: "SUPPLIER",
      entityId: "posco",
      mediaType: "SUPPLIER_FACTORY",
      isPrimary: true,
      existing,
      uploadedBy: "grok-bot",
    });

    expect(r.status).toBe("imported");
    expect(r.enhanced).toBe(true);
    expect(r.enhancer).toBe(PRE_ENHANCED_PROVIDER);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].prefix).toBe("suppliers/enhanced/posco");
    expect(uploads[0].contentType).toBe("image/jpeg");
    expect(r.media).toMatchObject({
      originalUrl: "packfile:images/suppliers/posco/05.jpg",
      mimeType: "image/jpeg",
      fileSize: JPEG.length,
      status: "unpublished",
      uploadedBy: "grok-bot",
      isPrimary: true,
    });
    expect(String(r.media?.storageKey)).toContain("suppliers/enhanced/posco/");
    const audit = rows.audit.find((a) => a.action === "enhance");
    expect(audit).toMatchObject({ adminUser: "grok-bot", entityType: "SUPPLIER", entityId: "posco" });
    expect(JSON.parse(String(audit?.detail))).toMatchObject({ enhanced: true, preEnhanced: true, provider: PRE_ENHANCED_PROVIDER, packFile: "enhanced/suppliers/posco/05.jpg" });
    // Dedupe keys updated so the same ref is skipped next time.
    expect(existing.has("packfile:images/suppliers/posco/05.jpg")).toBe(true);
    const again = await ingestRemoteImage({ url: "packfile:images/suppliers/posco/05.jpg", files, entityType: "SUPPLIER", entityId: "posco", mediaType: "SUPPLIER_FACTORY", existing });
    expect(again.status).toBe("skipped");
  });

  it("an original (non-enhanced) upload is stored under the plain prefix and not marked enhanced", async () => {
    const files = new PackFiles();
    files.add("images/products/acme/widget.png", PNG);
    const r = await ingestRemoteImage({ url: "packfile:images/products/acme/widget.png", files, entityType: "PRODUCT", entityId: "p1", mediaType: "PRODUCT_PRIMARY" });
    expect(r.status).toBe("imported");
    expect(r.enhanced).toBe(false);
    expect(uploads[0].prefix).toBe("products/p1");
    expect(uploads[0].contentType).toBe("image/png");
    expect(rows.audit.filter((a) => a.action === "enhance")).toHaveLength(0);
  });

  it("defers refs whose bytes are not in this upload and fails clearly on non-image bytes", async () => {
    const files = new PackFiles();
    files.add("enhanced/suppliers/x/fake.jpg", Buffer.from("<html>not an image</html>"));

    const deferred = await ingestRemoteImage({ url: "packfile:images/suppliers/x/missing.jpg", files, entityType: "SUPPLIER", entityId: "x", mediaType: "SUPPLIER_GALLERY" });
    expect(deferred.status).toBe("deferred");
    expect(deferred.reason).toMatch(/not included in this upload/);

    const noFiles = await ingestRemoteImage({ url: "packfile:images/suppliers/x/missing.jpg", entityType: "SUPPLIER", entityId: "x", mediaType: "SUPPLIER_GALLERY" });
    expect(noFiles.status).toBe("deferred");

    const bad = await ingestRemoteImage({ url: "packfile:images/suppliers/x/fake.jpg", files, entityType: "SUPPLIER", entityId: "x", mediaType: "SUPPLIER_GALLERY" });
    expect(bad.status).toBe("failed");
    expect(bad.reason).toMatch(/Unsupported or corrupted file/);
    expect(rows.media).toHaveLength(0);
  });

  it("still rejects non-http, non-packfile refs", async () => {
    const r = await ingestRemoteImage({ url: "/workspace/suppliers-phase1/daily/x.jpg", entityType: "SUPPLIER", entityId: "x", mediaType: "SUPPLIER_GALLERY" });
    expect(r.status).toBe("failed");
    expect(r.reason).toMatch(/not a public http\(s\) url/);
  });
});
