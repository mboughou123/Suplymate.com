import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* In-memory Prisma double (only the calls the import pipeline makes)  */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const { tables, table, processImportUrl } = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const tables: Record<string, Row[]> = {};
  let idSeq = 0;

  function matches(row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    for (const [k, v] of Object.entries(where)) {
      if (k === "OR") continue;
      if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
        const cond = v as Row;
        if ("equals" in cond) {
          const a = String(row[k] ?? "").toLowerCase();
          const b = String(cond.equals ?? "").toLowerCase();
          if (a !== b) return false;
          continue;
        }
        if ("in" in cond) {
          if (!(cond.in as unknown[]).includes(row[k])) return false;
          continue;
        }
        continue;
      }
      if (row[k] !== v) return false;
    }
    return true;
  }

  function table(name: string) {
    tables[name] ??= [];
    const rows = tables[name];
    return {
      findMany: async (args?: { where?: Row }) => rows.filter((r) => matches(r, args?.where)).map((r) => ({ ...r })),
      findFirst: async (args?: { where?: Row }) => {
        const hit = rows.find((r) => matches(r, args?.where));
        return hit ? { ...hit } : null;
      },
      findUnique: async (args: { where: { id: string } }) => {
        const hit = rows.find((r) => r.id === args.where.id);
        return hit ? { ...hit } : null;
      },
      create: async (args: { data: Row }) => {
        const row = { id: `${name}_${++idSeq}`, createdAt: new Date(), updatedAt: new Date(), ...args.data };
        rows.push(row);
        return { ...row };
      },
      update: async (args: { where: { id: string }; data: Row }) => {
        const hit = rows.find((r) => r.id === args.where.id);
        if (!hit) throw new Error("not found");
        Object.assign(hit, args.data, { updatedAt: new Date() });
        return { ...hit };
      },
      upsert: async (args: { where: { id: string }; create: Row; update: Row }) => {
        const hit = rows.find((r) => r.id === args.where.id);
        if (hit) {
          Object.assign(hit, args.update, { updatedAt: new Date() });
          return { ...hit };
        }
        const row = { createdAt: new Date(), updatedAt: new Date(), ...args.create };
        rows.push(row);
        return { ...row };
      },
      delete: async (args: { where: { id: string } }) => {
        const i = rows.findIndex((r) => r.id === args.where.id);
        if (i === -1) throw new Error("not found");
        return rows.splice(i, 1)[0];
      },
    };
  }

  // Remote image download + validation (SSRF-safe path) — stubbed to succeed.
  const processImportUrl = vi.fn(async (url: string, opts: { prefix: string }) => {
    if (url.includes("broken")) return { ok: false as const, error: "Source returned HTTP 404.", status: 400 };
    const filename = url.split("/").pop() ?? "img.jpg";
    const key = `${opts.prefix}/${filename}`;
    return {
      ok: true as const,
      stored: { url: `https://blob.example/${key}`, storageKey: key, provider: "vercel-blob" as const },
      mimeType: "image/jpeg",
      fileSize: 1234,
      filename,
      originalUrl: url,
    };
  });

  return { tables, table, processImportUrl };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplier: table("supplier"),
    scrapedProduct: table("scrapedProduct"),
    certification: table("certification"),
    media: table("media"),
    mediaAuditLog: table("mediaAuditLog"),
  },
}));

// Storage: pretend Vercel Blob is configured; uploads return a deterministic URL.
vi.mock("@/lib/image-storage", () => ({
  detectStorageProvider: () => "vercel-blob",
  storageProviderStatus: () => ({ provider: "vercel-blob", configured: true }),
  uploadBuffer: vi.fn(async (_buf: Buffer, opts: { prefix?: string; filename?: string }) => {
    const key = `${opts.prefix ?? "media"}/${(opts.filename ?? "file").replace(/\.[^.]+$/, "")}.jpg`;
    return { url: `https://blob.example/${key}`, storageKey: key, provider: "vercel-blob" };
  }),
  deleteFromStorage: vi.fn(async () => true),
  persistProductImage: vi.fn(async (u: string) => u),
}));

vi.mock("@/lib/media-upload", () => ({ processImportUrl }));

import { buildSupplierMergePatch, optionsFromBody, type DailyImportOptions } from "@/lib/import/daily-import";
import { parseImportPayload, mergePacks } from "@/lib/import/pack-formats";
import { normalizeSupplierInput } from "@/lib/supplier-normalize";

// The stores keep an in-memory overlay per module instance (their no-DB
// fallback). Re-import the orchestrator for every run so tests stay isolated.
async function runDailyImport(opts: DailyImportOptions) {
  vi.resetModules();
  const mod = await import("@/lib/import/daily-import");
  return mod.runDailyImport(opts);
}

const pack = () =>
  mergePacks([
    parseImportPayload({
      suppliers: [
        {
          company_name: "POSCO",
          primary_category: "Steel & Metals",
          country: "South Korea",
          city: "Pohang",
          website: "https://www.posco.com/",
          description: "POSCO is a South Korean steel manufacturer headquartered in Pohang, South Korea.",
          product_lines: ["Hot-rolled coil"],
          certifications: [{ name: "ISO 9001", source: "https://www.posco.com/" }],
          source_url: "https://en.wikipedia.org/wiki/POSCO",
          photo_urls: ["https://newsroom.posco.com/14.jpg", "https://newsroom.posco.com/15.jpg"],
          local_images: ["/workspace/suppliers-phase1/daily/x.jpg"],
          slug: "posco",
          // A bot must not be able to flip verification through the pack.
          verified: true,
          verificationStatus: "verified",
        },
        {
          company_name: "Al Gharbia Pipe Company LLC",
          primary_category: "Tube & Pipes",
          country: "United Arab Emirates",
          website: "https://algharbiapipe.com/",
          cert_image_urls: ["https://algharbiapipe.com/certs/Certificate-5L-1170.png"],
          certifications: ["API 5L (5L-1170)"],
          photo_urls: ["https://algharbiapipe.com/mill.jpg", "https://algharbiapipe.com/uploads/logo.png"],
          slug: "al-gharbia-pipe",
        },
      ],
    }),
    parseImportPayload({
      products: [
        {
          product_name: "POSCO Hot-Rolled Coil",
          product_slug: "posco-hot-rolled-coil",
          supplier_name: "POSCO",
          supplier_slug_guess: "posco",
          source_url: "https://www.posco.com/products/hrc",
          unit_price: null,
          price_note: "RFQ — mill quote only.",
          image_urls: ["https://www.posco.com/img/hrc.jpg", "https://www.posco.com/img/broken.jpg"],
        },
        {
          product_name: "Orphan Widget",
          supplier_name: "Unknown Mill Co",
          source_url: "https://unknown.example/widget",
          unit_price: 12.5,
          currency: "USD",
          image_urls: [],
        },
      ],
    }),
  ]);

beforeEach(() => {
  for (const k of Object.keys(tables)) tables[k].length = 0;
  processImportUrl.mockClear();
  vi.stubEnv("XAI_API_KEY", "");
  vi.stubEnv("IMPORT_BUNDLE_URL", "");
  vi.stubEnv("OUTSCRAPER_API_KEY", "");
  vi.stubEnv("IMAGE_ENHANCER_URL", "");
  vi.stubEnv("IMAGE_ENHANCE_WITH_OPENAI", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("runDailyImport", () => {
  it("is a clean no-op when no source is configured", async () => {
    const s = await runDailyImport({ trigger: "cron", deadlineMs: 5000 });
    expect(s.ok).toBe(true);
    expect(s.skipped).toBe("no_source_configured");
    expect(s.suppliers.created).toBe(0);
    expect(tables.supplier ?? []).toHaveLength(0);
    expect(tables.mediaAuditLog ?? []).toHaveLength(0);
  });

  it("imports a Lister pack: pending suppliers, pending products, unpublished media, certification rows", async () => {
    const s = await runDailyImport({ trigger: "admin", inline: pack(), deadlineMs: 20_000, actor: "test" });

    expect(s.ok).toBe(true);
    expect(s.skipped).toBeUndefined();
    expect(s.sources).toEqual(["inline:merged"]);
    // 2 pack suppliers + 1 minimal pending supplier created for the orphan product.
    expect(s.suppliers).toMatchObject({ seen: 2, created: 3, updated: 0, failed: 0, remaining: 0 });
    expect(s.products).toMatchObject({ seen: 2, created: 2, updated: 0, failed: 0 });
    expect(s.grok.configured).toBe(false);
    expect(s.enhancer.provider).toBe("none");
    expect(s.partial).toBe(false);

    // Suppliers are never auto-verified, whatever the pack claims.
    const suppliers = tables.supplier;
    expect(suppliers.map((r) => r.id).sort()).toEqual(["al-gharbia-pipe", "posco", "unknown-mill-co"]);
    for (const row of suppliers) {
      expect(row.verificationStatus).toBe("pending");
      expect(row.verified).toBe(false);
    }
    const posco = suppliers.find((r) => r.id === "posco")!;
    expect(JSON.parse(String(posco.images))).toEqual(["https://newsroom.posco.com/14.jpg", "https://newsroom.posco.com/15.jpg"]);

    // Products: stable ids, pending, RFQ price stays null (never invented).
    const products = tables.scrapedProduct;
    expect(products.map((p) => p.id).sort()).toEqual(["import-posco-posco-hot-rolled-coil", "import-unknown-mill-co-orphan-widget"]);
    const hrc = products.find((p) => p.id === "import-posco-posco-hot-rolled-coil")!;
    expect(hrc.status).toBe("pending");
    expect(hrc.basePrice).toBeNull();
    expect(hrc.supplierId).toBe("posco");
    expect(JSON.parse(String(hrc.specifications))).toMatchObject({ Pricing: "RFQ — mill quote only." });
    const widget = products.find((p) => p.id === "import-unknown-mill-co-orphan-widget")!;
    expect(widget.basePrice).toBe(12.5);
    expect(widget.supplierId).toBe("unknown-mill-co");

    // Certifications: ISO 9001 (no scan) + API 5L (with scan) → CLAIMED, never verified.
    const certs = tables.certification;
    expect(certs.map((c) => c.name).sort()).toEqual(["API 5L (5L-1170)", "ISO 9001"]);
    for (const c of certs) expect(c.status).toBe("claimed");
    const api5l = certs.find((c) => c.name === "API 5L (5L-1170)")!;

    // Media: 2 POSCO photos + 1 AGP mill photo (logo dropped by heuristics) + 1 cert scan + 1 product image; broken one failed.
    const media = tables.media;
    expect(s.media.imported).toBe(5);
    expect(s.media.failed).toBe(1);
    expect(s.media.enhanced).toBe(0);
    expect(media).toHaveLength(5);
    for (const m of media) {
      expect(m.status).toBe("unpublished");
      expect(m.uploadedBy).toBe("test");
      expect(String(m.url)).toMatch(/^https:\/\/blob\.example\//);
    }
    expect(media.filter((m) => m.entityType === "SUPPLIER" && m.entityId === "posco")).toHaveLength(2);
    expect(media.find((m) => m.entityType === "CERTIFICATION")).toMatchObject({ entityId: api5l.id, mediaType: "CERTIFICATION" });
    expect(media.find((m) => m.entityType === "PRODUCT")).toMatchObject({
      entityId: "import-posco-posco-hot-rolled-coil",
      mediaType: "PRODUCT_PRIMARY",
      originalUrl: "https://www.posco.com/img/hrc.jpg",
    });
    expect(media.some((m) => m.originalUrl === "https://algharbiapipe.com/uploads/logo.png")).toBe(false);
    expect(s.errors.some((e) => /broken\.jpg/.test(e) || /404/.test(e))).toBe(true);

    // Legacy certificationImages stays in sync for the existing profile UI.
    const agp = suppliers.find((r) => r.id === "al-gharbia-pipe")!;
    expect(JSON.parse(String(agp.certificationImages))).toEqual(["https://algharbiapipe.com/certs/Certificate-5L-1170.png"]);

    // Run log persisted as an audit row.
    const runLog = tables.mediaAuditLog.filter((a) => a.action === "daily_import");
    expect(runLog).toHaveLength(1);
    expect(JSON.parse(String(runLog[0].detail))).toMatchObject({ trigger: "admin", suppliers: { created: 3 } });
  });

  it("is idempotent: a second run skips everything already imported", async () => {
    await runDailyImport({ trigger: "cli", inline: pack(), deadlineMs: 20_000 });
    const before = { suppliers: tables.supplier.length, products: tables.scrapedProduct.length, media: tables.media.length, certs: tables.certification.length };
    processImportUrl.mockClear();

    const s = await runDailyImport({ trigger: "cli", inline: pack(), deadlineMs: 20_000 });
    expect(s.ok).toBe(true);
    expect(s.suppliers.created).toBe(0);
    expect(s.suppliers.updated).toBe(0);
    expect(s.products.created).toBe(0);
    expect(s.media.imported).toBe(0);
    expect(s.certifications.created).toBe(0);
    expect(tables.supplier).toHaveLength(before.suppliers);
    expect(tables.scrapedProduct).toHaveLength(before.products);
    expect(tables.media).toHaveLength(before.media);
    expect(tables.certification).toHaveLength(before.certs);
    // Only the (still) broken product image is retried; everything else is deduped before download.
    expect(processImportUrl.mock.calls.map((c) => c[0])).toEqual(["https://www.posco.com/img/broken.jpg"]);
  });

  it("bounds the run by IMPORT_DAILY_LIMIT and reports the remainder", async () => {
    const s = await runDailyImport({ trigger: "cron", inline: pack(), limit: 1, productLimit: 1, deadlineMs: 20_000 });
    expect(s.partial).toBe(true);
    expect(s.suppliers).toMatchObject({ seen: 2, created: 1, remaining: 1 });
    expect(s.products).toMatchObject({ seen: 2, created: 1, remaining: 1 });
    expect(tables.supplier.map((r) => r.id)).toEqual(["posco"]);
  });

  it("dry-run writes nothing", async () => {
    const s = await runDailyImport({ trigger: "cli", inline: pack(), dryRun: true, deadlineMs: 20_000 });
    expect(s.dryRun).toBe(true);
    expect(s.suppliers.created).toBe(3);
    expect(s.products.created).toBe(2);
    expect(tables.supplier ?? []).toHaveLength(0);
    expect(tables.scrapedProduct ?? []).toHaveLength(0);
    expect(tables.media ?? []).toHaveLength(0);
    expect(processImportUrl).not.toHaveBeenCalled();
  });

  it("runs the webhook enhancer and stores the enhanced file next to the original", async () => {
    vi.stubEnv("IMAGE_ENHANCER_URL", "https://enhancer.example/enhance");
    vi.stubEnv("IMAGE_ENHANCER_KEY", "k");
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const fetchStub = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      void _init;
      const url = String(input);
      if (url.startsWith("https://enhancer.example/")) {
        return new Response(JSON.stringify({ url: "https://cdn.example/enhanced/out.jpg" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(jpeg, { status: 200, headers: { "Content-Type": "image/jpeg", "Content-Length": String(jpeg.byteLength) } });
    });
    vi.stubGlobal("fetch", fetchStub);

    const s = await runDailyImport({ trigger: "admin", inline: pack(), deadlineMs: 20_000 });
    expect(s.enhancer.provider).toBe("webhook");
    expect(s.media.imported).toBe(5);
    expect(s.media.enhanced).toBe(5);
    const media = tables.media;
    for (const m of media) expect(String(m.storageKey)).toMatch(/\/enhanced\//);
    expect(tables.mediaAuditLog.filter((a) => a.action === "enhance")).toHaveLength(5);
    // The webhook was called with the documented contract.
    const call = fetchStub.mock.calls.find((c) => String(c[0]).startsWith("https://enhancer.example/"))!;
    const init = call[1]!;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k");
    expect(JSON.parse(String(init.body))).toMatchObject({ imageUrl: expect.stringMatching(/^https:\/\//), kind: expect.stringMatching(/photo|certificate/) });
  });

  it("merges into existing suppliers without touching verification", async () => {
    // Pre-existing verified supplier with a sparse profile.
    const existing = normalizeSupplierInput({ id: "posco", name: "POSCO", website: "https://www.posco.com/", verificationStatus: "verified" });
    tables.supplier.push({
      ...existing,
      images: "[]",
      certificationImages: "[]",
      certifications: "[]",
      products: "[]",
      deliveryRegions: JSON.stringify(existing.deliveryRegions),
      description: null,
      country: null,
    });

    const s = await runDailyImport({ trigger: "cron", inline: pack(), limit: 1, productLimit: 0, deadlineMs: 20_000 });
    expect(s.suppliers).toMatchObject({ created: 0, updated: 1 });
    const row = tables.supplier.find((r) => r.id === "posco")!;
    expect(row.verificationStatus).toBe("verified"); // untouched
    expect(row.verified).toBe(true);
    expect(row.country).toBe("South Korea");
    expect(String(row.description)).toMatch(/POSCO is a South Korean/);
    expect(JSON.parse(String(row.images))).toHaveLength(2);
  });
});

describe("runDailyImport: product → supplier linking", () => {
  it("attaches products to an existing supplier by name when the bot's slug guess differs", async () => {
    const existing = normalizeSupplierInput({ id: "arabian-pipes-company", name: "Arabian Pipes Company", country: "Saudi Arabia" });
    tables.supplier.push({
      ...existing,
      images: "[]",
      certificationImages: "[]",
      certifications: "[]",
      products: "[]",
      deliveryRegions: "[]",
    });
    const inline = parseImportPayload({
      products: [
        {
          product_name: "APC ERW Line Pipe",
          supplier_name: "Arabian Pipes Company",
          supplier_slug_guess: "arabian-pipes",
          source_url: "https://arabianpipes.example/erw",
          unit_price: null,
          image_urls: [],
        },
      ],
    });
    const s = await runDailyImport({ trigger: "cli", inline, deadlineMs: 20_000 });
    expect(s.ok).toBe(true);
    expect(s.suppliers.created).toBe(0);
    expect(tables.supplier).toHaveLength(1);
    expect(tables.scrapedProduct).toHaveLength(1);
    expect(tables.scrapedProduct[0]).toMatchObject({ supplierId: "arabian-pipes-company", supplierName: "Arabian Pipes Company", status: "pending", basePrice: null });
  });
});

describe("helpers", () => {
  it("buildSupplierMergePatch only fills blanks and appends", () => {
    const existing = normalizeSupplierInput({ id: "x", name: "X", description: "keep me", images: ["https://a/1.jpg"], products: ["A"] });
    const patch = buildSupplierMergePatch(existing, {
      name: "X",
      description: "replace attempt",
      country: "Germany",
      images: ["https://a/1.jpg", "https://a/2.jpg"],
      products: ["A", "B"],
      certifications: [{ name: "ISO 9001" }],
    });
    expect(patch.description).toBeUndefined();
    expect(patch.country).toBe("Germany");
    expect(patch.images).toEqual(["https://a/1.jpg", "https://a/2.jpg"]);
    expect(patch.products).toEqual(["A", "B"]);
    expect(patch.certifications).toEqual([{ name: "ISO 9001" }]);
    expect("verificationStatus" in patch).toBe(false);
  });

  it("optionsFromBody validates and caps inputs", () => {
    expect(optionsFromBody({ limit: 9999, dryRun: "1", enhance: false, bundleUrl: " https://x/y.json " })).toEqual({
      limit: 500,
      dryRun: true,
      enhance: false,
      bundleUrls: ["https://x/y.json"],
    });
    expect(optionsFromBody(null)).toEqual({});
  });
});
