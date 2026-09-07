// @vitest-environment node
// (jsdom FormData/Blob globals do not interoperate with undici Request bodies)
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* Mocks: Prisma double, storage, admin session                        */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const { tables, table, adminState } = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const tables: Record<string, Row[]> = {};
  let idSeq = 0;
  const adminState = { session: null as { email: string } | null };

  function matches(row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    for (const [k, v] of Object.entries(where)) {
      if (k === "OR") continue;
      if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
        const cond = v as Row;
        if ("equals" in cond) {
          if (String(row[k] ?? "").toLowerCase() !== String(cond.equals ?? "").toLowerCase()) return false;
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
  return { tables, table, adminState };
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

vi.mock("@/lib/image-storage", () => ({
  detectStorageProvider: () => "vercel-blob",
  storageProviderStatus: () => ({ provider: "vercel-blob", configured: true }),
  uploadBuffer: vi.fn(async (_buf: Buffer, opts: { prefix?: string; filename?: string }) => {
    const key = `${opts.prefix ?? "media"}/${opts.filename ?? "file"}`;
    return { url: `https://blob.example/${key}`, storageKey: key, provider: "vercel-blob" };
  }),
  deleteFromStorage: vi.fn(async () => true),
  persistProductImage: vi.fn(async (u: string) => u),
}));

// Remote downloads are stubbed; uploaded-bytes processing uses the real code.
vi.mock("@/lib/media-upload", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media-upload")>();
  return {
    ...actual,
    processImportUrl: vi.fn(async (url: string, opts: { prefix: string }) => {
      const filename = url.split("/").pop() ?? "img.jpg";
      const key = `${opts.prefix}/${filename}`;
      return { ok: true as const, stored: { url: `https://blob.example/${key}`, storageKey: key, provider: "vercel-blob" as const }, mimeType: "image/jpeg", fileSize: 10, filename, originalUrl: url };
    }),
  };
});

vi.mock("@/lib/admin", async () => {
  const { NextResponse } = await import("next/server");
  return {
    checkAdmin: async () => ({ ok: !!adminState.session, authenticated: !!adminState.session, session: null, email: adminState.session?.email ?? null }),
    adminGuard: async () => (adminState.session ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 })),
  };
});

import { sha256Hex } from "@/lib/import/seal";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const SECRET = "s3cret-cron-token";
const DAY = "2026-09-02";
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00]);
const VM = `/workspace/suppliers-phase1/daily/${DAY}`;

const suppliersJson = JSON.stringify({
  generated_at_utc: `${DAY}T18:55:41Z`,
  suppliers: [
    {
      company_name: "POSCO",
      slug: "posco",
      primary_category: "Steel & Metals",
      country: "South Korea",
      website: "https://www.posco.com/",
      description: "POSCO is a South Korean steel manufacturer headquartered in Pohang.",
      photo_urls: ["https://newsroom.posco.com/14.jpg"],
      local_images: [`${VM}/images/suppliers/posco/05.jpg`, `${VM}/images/suppliers/posco/06.jpg`],
      certifications: [{ name: "ISO 9001", local_image: `${VM}/images/certs/posco/iso9001.jpg` }],
    },
  ],
});
const productsJson = JSON.stringify({
  products: [
    {
      product_name: "POSCO Hot-Rolled Coil",
      product_slug: "posco-hot-rolled-coil",
      supplier_name: "POSCO",
      supplier_slug_guess: "posco",
      source_url: "https://www.posco.com/products/hrc",
      unit_price: null,
      local_images: [`${VM}/images/products/posco/hrc.jpg`],
    },
  ],
});
const seal = (over: Record<string, unknown> = {}) => ({
  day: DAY,
  researcherOk: true,
  approvedBy: "Researcher",
  approvedAt: `${DAY}T19:40:00Z`,
  sha256: { "suppliers.json": sha256Hex(suppliersJson), "products.json": sha256Hex(productsJson) },
  ...over,
});

type Part = string | { data: Buffer | string; name: string; type?: string };
function multipart(fields: Record<string, Part>, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === "string") form.set(k, v);
    else form.append(k, new Blob([typeof v.data === "string" ? v.data : new Uint8Array(v.data)], { type: v.type ?? "application/octet-stream" }), v.name);
  }
  return new Request("http://localhost/api/admin/import/run", { method: "POST", body: form, headers });
}
const bearer = (token = SECRET) => ({ authorization: `Bearer ${token}` });
const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/admin/import/run", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

function dayFields(files: Record<string, Buffer>, chunk: { part: number; of: number } = { part: 1, of: 1 }, sealDoc: unknown = seal()) {
  const f: Record<string, Part> = {
    day: DAY,
    part: String(chunk.part),
    of: String(chunk.of),
    seal: { data: JSON.stringify(sealDoc), name: "seal.json", type: "application/json" },
    "suppliers.json": { data: suppliersJson, name: "suppliers.json", type: "application/json" },
    "products.json": { data: productsJson, name: "products.json", type: "application/json" },
  };
  for (const [path, data] of Object.entries(files)) f[path] = { data, name: path.split("/").pop()!, type: "image/jpeg" };
  return f;
}

const ALL_FILES = {
  "enhanced/suppliers/posco/05.jpg": JPEG,
  "enhanced/suppliers/posco/06.jpg": JPEG,
  "enhanced/certs/posco/iso9001.jpg": JPEG,
  "enhanced/products/posco/hrc.jpg": JPEG,
};

// Stores keep module-level overlays; re-import the route per test for isolation.
async function route() {
  vi.resetModules();
  return import("@/app/api/admin/import/run/route");
}

beforeEach(() => {
  for (const k of Object.keys(tables)) tables[k].length = 0;
  adminState.session = null;
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("XAI_API_KEY", "");
  vi.stubEnv("IMPORT_BUNDLE_URL", "");
  vi.stubEnv("OUTSCRAPER_API_KEY", "");
  vi.stubEnv("IMAGE_ENHANCER_URL", "");
  vi.stubEnv("IMPORT_REQUIRE_SEAL", "");
  vi.stubEnv("IMPORT_PUSH_MAX_BYTES", "");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */

describe("POST /api/admin/import/run — auth", () => {
  it("401 without a session or bearer", async () => {
    const { POST } = await route();
    const res = await POST(json({}));
    expect(res.status).toBe(401);
  });

  it("401 with the wrong bearer, and when CRON_SECRET is unset", async () => {
    const { POST } = await route();
    expect((await POST(json({}, bearer("nope")))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await POST(json({}, bearer(SECRET)))).status).toBe(401);
  });

  it("bearer CRON_SECRET is accepted and attributed to grok-bot; no pack → env fallback no-op", async () => {
    const { POST } = await route();
    const res = await POST(json({}, bearer()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, skipped: "no_source_configured", actor: "grok-bot" });
  });

  it("an admin session works too and is attributed to the admin email", async () => {
    adminState.session = { email: "amine@suplymate.com" };
    const { POST } = await route();
    const body = await (await POST(json({}))).json();
    expect(body.actor).toBe("amine@suplymate.com");
  });
});

describe("POST /api/admin/import/run — seal gate", () => {
  it("422 unsealed when a pack is pushed without a seal", async () => {
    const { POST } = await route();
    const fields = dayFields(ALL_FILES);
    delete fields.seal;
    const res = await POST(multipart(fields, bearer()));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ ok: false, skipped: "unsealed", day: DAY });
    expect(tables.supplier).toHaveLength(0);
    expect(tables.media).toHaveLength(0);
  });

  it("422 when researcherOk is false, the day differs, or a hash mismatches", async () => {
    const { POST } = await route();
    const notOk = await POST(multipart(dayFields(ALL_FILES, undefined, seal({ researcherOk: false })), bearer()));
    expect(notOk.status).toBe(422);
    expect((await notOk.json()).error).toMatch(/not Researcher-approved/);

    const wrongDay = await POST(multipart(dayFields(ALL_FILES, undefined, seal({ day: "2026-09-03" })), bearer()));
    expect(wrongDay.status).toBe(422);
    expect((await wrongDay.json()).error).toMatch(/does not match pushed day/);

    const tampered = await POST(multipart(dayFields(ALL_FILES, undefined, seal({ sha256: { "products.json": sha256Hex("something else") } })), bearer()));
    expect(tampered.status).toBe(422);
    expect((await tampered.json()).error).toBe("sha256 mismatch for products.json");
    expect(tables.supplier).toHaveLength(0);
  });

  it("IMPORT_REQUIRE_SEAL=false lets an unsealed pack through with a warning", async () => {
    vi.stubEnv("IMPORT_REQUIRE_SEAL", "false");
    const { POST } = await route();
    const fields = dayFields(ALL_FILES);
    delete fields.seal;
    const res = await POST(multipart(fields, bearer()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.suppliers.created).toBe(1);
    expect(body.warnings.join("\n")).toMatch(/IMPORT_REQUIRE_SEAL=false/);
    expect(body.seal).toBeUndefined();
  });
});

describe("POST /api/admin/import/run — sealed multipart push", () => {
  it("imports the day: pending supplier/product, uploaded stills stored as enhanced, seal + chunk in summary, grok-bot attribution", async () => {
    const { POST } = await route();
    const res = await POST(multipart(dayFields(ALL_FILES), bearer()));
    expect(res.status).toBe(200);
    const s = await res.json();

    expect(s.ok).toBe(true);
    expect(s.actor).toBe("grok-bot");
    expect(s.day).toBe(DAY);
    expect(s.chunk).toEqual({ part: 1, of: 1 });
    expect(s.seal).toMatchObject({ day: DAY, researcherOk: true, approvedBy: "Researcher", hashedFiles: ["suppliers.json", "products.json"] });
    expect(s.uploads).toEqual({ files: 4, bytes: JPEG.length * 4 });
    expect(s.sources).toEqual([`inline:push:${DAY}`]);
    expect(s.suppliers).toMatchObject({ seen: 1, created: 1, failed: 0 });
    expect(s.products).toMatchObject({ seen: 1, created: 1, failed: 0 });
    // 2 supplier stills + 1 cert scan + 1 product still from uploads, 1 remote photo.
    expect(s.media).toMatchObject({ imported: 5, enhanced: 4, failed: 0, deferred: 0 });
    expect(s.certifications.created).toBe(1);

    const supplier = tables.supplier[0];
    expect(supplier.verificationStatus).toBe("pending");
    expect(tables.scrapedProduct[0].status).toBe("pending");

    const media = tables.media;
    expect(media).toHaveLength(5);
    expect(media.every((m) => m.status === "unpublished" && m.uploadedBy === "grok-bot")).toBe(true);
    const uploaded = media.filter((m) => String(m.originalUrl).startsWith("packfile:"));
    expect(uploaded).toHaveLength(4);
    expect(uploaded.every((m) => String(m.storageKey).includes("/enhanced/"))).toBe(true);
    expect(uploaded.map((m) => m.originalUrl).sort()).toEqual([
      "packfile:images/certs/posco/iso9001.jpg",
      "packfile:images/products/posco/hrc.jpg",
      "packfile:images/suppliers/posco/05.jpg",
      "packfile:images/suppliers/posco/06.jpg",
    ]);
    expect(media.find((m) => m.mediaType === "PRODUCT_PRIMARY")?.originalUrl).toBe("packfile:images/products/posco/hrc.jpg");
    expect(media.find((m) => m.mediaType === "CERTIFICATION")?.entityType).toBe("CERTIFICATION");

    const enhanceLogs = tables.mediaAuditLog.filter((a) => a.action === "enhance");
    expect(enhanceLogs).toHaveLength(4);
    expect(enhanceLogs.every((a) => a.adminUser === "grok-bot")).toBe(true);
    expect(JSON.parse(String(enhanceLogs[0].detail))).toMatchObject({ enhanced: true, preEnhanced: true, provider: "grok-bot-image-enhancer" });

    const ledger = tables.mediaAuditLog.filter((a) => a.action === "import_day");
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ entityType: "IMPORT_DAY", entityId: DAY, adminUser: "grok-bot" });
    expect(JSON.parse(String(ledger[0].detail))).toMatchObject({ part: 1, of: 1, digest: s.seal.digest });
    const runLog = tables.mediaAuditLog.find((a) => a.action === "daily_import");
    expect(runLog?.adminUser).toBe("grok-bot");
  });

  it("re-posting a completed day at the same seal digest is a no-op", async () => {
    const { POST } = await route();
    const first = await (await POST(multipart(dayFields(ALL_FILES), bearer()))).json();
    const mediaBefore = tables.media.length;

    const again = await POST(multipart(dayFields(ALL_FILES), bearer()));
    expect(again.status).toBe(200);
    const body = await again.json();
    expect(body).toMatchObject({ ok: true, skipped: "already_imported", day: DAY, complete: true, importedParts: [1] });
    expect(body.seal.digest).toBe(first.seal.digest);
    expect(tables.media).toHaveLength(mediaBefore);
    expect(tables.mediaAuditLog.filter((a) => a.action === "import_day")).toHaveLength(1);

    // A revised pack (new hash → new digest) is imported again, still without duplicating media.
    const revised = { ...JSON.parse(productsJson), products: [] };
    const revisedText = JSON.stringify(revised);
    const fields = dayFields(ALL_FILES, undefined, seal({ sha256: { "suppliers.json": sha256Hex(suppliersJson), "products.json": sha256Hex(revisedText) } }));
    fields["products.json"] = { data: revisedText, name: "products.json", type: "application/json" };
    const third = await (await POST(multipart(fields, bearer()))).json();
    expect(third.skipped).toBeUndefined();
    expect(third.suppliers.skipped).toBe(1);
    expect(third.media.skipped).toBeGreaterThan(0);
    expect(tables.media).toHaveLength(mediaBefore);
  });

  it("chunks: files missing from a chunk are deferred, the next chunk imports them, repeated chunks are no-ops", async () => {
    const { POST } = await route();
    const part1 = await (await POST(multipart(dayFields({ "enhanced/suppliers/posco/05.jpg": JPEG }, { part: 1, of: 2 }), bearer()))).json();
    expect(part1.ok).toBe(true);
    expect(part1.chunk).toEqual({ part: 1, of: 2 });
    expect(part1.media).toMatchObject({ imported: 2, deferred: 3, failed: 0 }); // 05.jpg + remote photo; 06, cert, product deferred
    expect(part1.suppliers.created).toBe(1);

    const rest = { ...ALL_FILES } as Record<string, Buffer>;
    delete rest["enhanced/suppliers/posco/05.jpg"];
    const part2 = await (await POST(multipart(dayFields(rest, { part: 2, of: 2 }), bearer()))).json();
    expect(part2.ok).toBe(true);
    expect(part2.suppliers).toMatchObject({ created: 0, skipped: 1 });
    expect(part2.products).toMatchObject({ created: 0, skipped: 1 });
    expect(part2.media).toMatchObject({ imported: 3, deferred: 0, failed: 0 });
    expect(tables.media).toHaveLength(5);

    const status = await (await POST(multipart(dayFields(rest, { part: 2, of: 2 }), bearer()))).json();
    expect(status).toMatchObject({ skipped: "already_imported", complete: true, importedParts: [1, 2] });
  });

  it("a chunk with failed uploads is not recorded, so it can be pushed again", async () => {
    const { POST } = await route();
    const files = { ...ALL_FILES, "enhanced/suppliers/posco/06.jpg": Buffer.from("<html>not an image</html>") };
    const first = await (await POST(multipart(dayFields(files), bearer()))).json();
    expect(first.ok).toBe(true);
    expect(first.media.failed).toBe(1);
    expect(first.warnings.join("\n")).toMatch(/not recorded in the import ledger/);
    expect(tables.mediaAuditLog.filter((a) => a.action === "import_day")).toHaveLength(0);

    const retry = await (await POST(multipart(dayFields(ALL_FILES), bearer()))).json();
    expect(retry.skipped).toBeUndefined();
    expect(retry.media).toMatchObject({ imported: 1, skipped: 4, failed: 0 });
    expect(tables.media).toHaveLength(5);
    expect(tables.mediaAuditLog.filter((a) => a.action === "import_day")).toHaveLength(1);
  });

  it("dryRun option writes nothing and records no ledger entry", async () => {
    const { POST } = await route();
    const fields = dayFields(ALL_FILES);
    fields.options = '{"dryRun":true}';
    const s = await (await POST(multipart(fields, bearer()))).json();
    expect(s.ok).toBe(true);
    expect(s.dryRun).toBe(true);
    expect(s.suppliers.created).toBe(1);
    expect(s.media).toMatchObject({ imported: 5, enhanced: 4, deferred: 0 });
    expect(tables.supplier).toHaveLength(0);
    expect(tables.media).toHaveLength(0);
    expect(tables.mediaAuditLog).toHaveLength(0);
  });

  it("413 when the body exceeds IMPORT_PUSH_MAX_BYTES", async () => {
    vi.stubEnv("IMPORT_PUSH_MAX_BYTES", "1000");
    const { POST } = await route();
    const res = await POST(multipart(dayFields(ALL_FILES), bearer()));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toMatch(/at most 1000 bytes/);
    expect(tables.supplier).toHaveLength(0);
  });

  it("JSON body with data: URL files works for small pushes", async () => {
    const { POST } = await route();
    const res = await POST(
      json(
        {
          day: DAY,
          seal: seal({ sha256: {} }),
          suppliers: suppliersJson,
          products: JSON.parse(productsJson),
          files: Object.fromEntries(Object.entries(ALL_FILES).map(([k, v]) => [k, `data:image/jpeg;base64,${v.toString("base64")}`])),
        },
        bearer()
      )
    );
    expect(res.status).toBe(200);
    const s = await res.json();
    expect(s.ok).toBe(true);
    expect(s.uploads.files).toBe(4);
    expect(s.media).toMatchObject({ imported: 5, enhanced: 4 });
  });
});

describe("GET /api/admin/import/run", () => {
  it("is behind the same auth and reports the push contract + ledger", async () => {
    const { GET, POST } = await route();
    expect((await GET(new Request("http://localhost/api/admin/import/run"))).status).toBe(401);

    const first = await (await POST(multipart(dayFields(ALL_FILES), bearer()))).json();
    const res = await GET(new Request(`http://localhost/api/admin/import/run?day=${DAY}&digest=${first.seal.digest}`, { headers: bearer() }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.actor).toBe("grok-bot");
    expect(body.cronSecretSet).toBe(true);
    expect(body.push).toMatchObject({ endpoint: "/api/admin/import/run", sealRequired: true, maxBytesPerRequest: 4_000_000 });
    expect(body.ledger).toMatchObject({ day: DAY, complete: true, partsDone: [1] });
  });
});
