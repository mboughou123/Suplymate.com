// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ */
/* Prisma / storage doubles (same shape as daily-import.test.ts)        */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;
const { tables, table } = vi.hoisted(() => {
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
  return { tables, table };
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

import { GithubPackFiles, GithubClient, daysInTree, loadGithubPack, parseGithubPackSpec, sealPathsFor } from "@/lib/import/github-pack";
import { sha256Hex } from "@/lib/import/seal-format";
import type { DailyImportOptions } from "@/lib/import/daily-import";

async function runDailyImport(opts: DailyImportOptions) {
  vi.resetModules();
  const mod = await import("@/lib/import/daily-import");
  return mod.runDailyImport(opts);
}

/* ------------------------------------------------------------------ */
/* Fake GitHub: tree + raw files                                        */
/* ------------------------------------------------------------------ */

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
const SPEC = parseGithubPackSpec("mboughou123/suplymate.com@cursor/amine-review-nav-mate-ctas-83a7:data")!;

// Shapes trimmed from the real data/daily-2026-09-03-*.json on the bot branch.
const suppliers0903 = JSON.stringify({
  generated_at_pt: "2026-09-03 09:33 PT",
  task: "Daily expansion 2026-09-03 — NEW suppliers batch (~50 mills) with photos",
  exclude_csv: "/workspace/suppliers-phase1/daily/2026-09-03/_exclude_names.txt",
  suppliers: [
    {
      company_name: "THK Co., Ltd.",
      primary_category: "Hardware & Motion",
      country: "Japan",
      city: "Tokyo",
      website: "https://www.thk.com/",
      description: "THK is a Japanese manufacturer of linear motion guides and ball screws.",
      slug: "thk",
      local_images: ["/workspace/suppliers-phase1/daily/2026-09-03/images/suppliers/thk/thk_01.jpg", "/workspace/suppliers-phase1/daily/2026-09-03/images/suppliers/thk/thk_02.jpg"],
      photo_urls: [],
    },
    {
      company_name: "Bossard Group",
      primary_category: "Hardware & Motion",
      country: "Switzerland",
      city: "Zug",
      website: "https://www.bossard.com/",
      description: "Bossard Group is a Swiss multinational fastener technology and logistics company.",
      slug: "bossard",
      local_images: ["/workspace/suppliers-phase1/daily/2026-09-03/images/suppliers/bossard/bossard_01.jpg"],
      photo_urls: [],
    },
  ],
});
const products0903 = JSON.stringify({
  date: "2026-09-03",
  products: [
    {
      product_name: "Amcor AmLite HeatReady",
      supplier_name: "Amcor",
      supplier_slug_guess: "amcor",
      category: "Packaging",
      unit_price: null,
      price_note: "RFQ",
      image_urls: [],
      local_images: ["/workspace/suppliers-phase1/daily/2026-09-03/images/products/amcor/amlite-heatready-local.jpg"],
    },
  ],
});
const manifest0903 = JSON.stringify([
  {
    src: "/workspace/suppliers-phase1/daily/2026-09-03/images/products/amcor/amlite-heatready-local.jpg",
    dst: "/workspace/suppliers-phase1/daily/2026-09-03/enhanced/products/amcor/amlite-heatready-local.jpg",
    in_size: [2000, 850],
    out_size: [1600, 680],
  },
]);
const suppliers0902 = JSON.stringify({ suppliers: [{ company_name: "POSCO", primary_category: "Steel & Metals", country: "South Korea", slug: "posco", photo_urls: [] }] });
const products0902 = JSON.stringify({ products: [] });

const seal0903 = {
  day: "2026-09-03",
  researcherOk: true,
  approvedBy: "Researcher",
  approvedAt: "2026-09-03T17:05:00Z",
  sha256: { "suppliers.json": sha256Hex(suppliers0903), "products.json": sha256Hex(products0903) },
  softHold: { bossard: "distributor/logistics identity — not a mill seal" },
};
const seal0902 = { day: "2026-09-02", researcherOk: true, sha256: { "suppliers.json": sha256Hex(suppliers0902) } };

type Repo = Record<string, string | Buffer>;
function baseRepo(): Repo {
  return {
    "data/certifications.json": "{}",
    "data/daily-2026-09-02-suppliers.json": suppliers0902,
    "data/daily-2026-09-02-products.json": products0902,
    "data/daily-2026-09-02-manifest-suppliers.json": "[]",
    "data/daily-2026-09-03-suppliers.json": suppliers0903,
    "data/daily-2026-09-03-products.json": products0903,
    "data/daily-2026-09-03-manifest-products.json": manifest0903,
    "data/daily-2026-09-03-summary.md": "# Daily 2026-09-03",
    "data/daily-2026-09-04-products.json": products0902, // Friday routine failed: products only, no seal
    "public/images/suppliers/thk/thk_01.jpg": JPEG,
    "public/images/suppliers/thk/thk_02.jpg": JPEG,
    "public/images/suppliers/bossard/bossard_01.jpg": JPEG,
    "public/images/products/amcor/amlite-heatready-local.jpg": JPEG,
    "src/lib/daily-2026-09-03-suppliers.ts": "export {}",
  };
}

const calls: string[] = [];
function fakeFetch(repo: Repo): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    const auth = new Headers(init?.headers).get("authorization");
    if (url.startsWith("https://api.github.com/repos/mboughou123/suplymate.com/git/trees/")) {
      expect(auth).toBe("Bearer ghp_test");
      const tree = Object.entries(repo).map(([path, v]) => ({ path, type: "blob", sha: sha256Hex(typeof v === "string" ? v : v).slice(0, 40), size: v.length }));
      return new Response(JSON.stringify({ sha: "abc", tree, truncated: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    const m = url.match(/^https:\/\/raw\.githubusercontent\.com\/mboughou123\/suplymate\.com\/cursor\/amine-review-nav-mate-ctas-83a7\/(.+)$/);
    if (m) {
      const path = decodeURIComponent(m[1]);
      const v = repo[path];
      if (v === undefined) return new Response("Not Found", { status: 404 });
      return new Response(typeof v === "string" ? v : new Uint8Array(v), { status: 200 });
    }
    return new Response("unexpected", { status: 500 });
  }) as typeof fetch;
}

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(tables)) tables[k].length = 0;
  vi.stubEnv("GITHUB_TOKEN", "ghp_test");
  vi.stubEnv("IMPORT_GITHUB_PACK", "");
  vi.stubEnv("IMPORT_BUNDLE_URL", "");
  vi.stubEnv("OUTSCRAPER_API_KEY", "");
  vi.stubEnv("XAI_API_KEY", "");
  vi.stubEnv("IMAGE_ENHANCER_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

/* ------------------------------------------------------------------ */

describe("parseGithubPackSpec", () => {
  it("parses owner/repo@branch:path with defaults", () => {
    expect(SPEC).toEqual({ owner: "mboughou123", repo: "suplymate.com", ref: "cursor/amine-review-nav-mate-ctas-83a7", path: "data" });
    expect(parseGithubPackSpec("acme/packs")).toEqual({ owner: "acme", repo: "packs", ref: "main", path: "data" });
    expect(parseGithubPackSpec("acme/packs@daily:packs/out/")).toEqual({ owner: "acme", repo: "packs", ref: "daily", path: "packs/out" });
    expect(parseGithubPackSpec("https://github.com/acme/packs.git@main")).toEqual({ owner: "acme", repo: "packs", ref: "main", path: "data" });
    expect(parseGithubPackSpec("")).toBeNull();
    expect(parseGithubPackSpec("not a spec")).toBeNull();
  });
});

describe("tree helpers", () => {
  it("lists days newest first and ranks seal candidates", () => {
    const paths = Object.keys(baseRepo());
    expect(daysInTree(paths, "data")).toEqual(["2026-09-04", "2026-09-03", "2026-09-02"]);
    const withSeals = [...paths, "data/_seals/2026-09-03.json", "data/_seals/README.json", "data/daily-2026-09-02/seal.json", "data/_qa/notes.json", "data/seals.json"];
    expect(sealPathsFor(withSeals, "data", "2026-09-03")).toEqual(["data/_seals/2026-09-03.json", "data/_qa/notes.json", "data/_seals/README.json", "data/seals.json"]);
    expect(sealPathsFor(withSeals, "data", "2026-09-02")[0]).toBe("data/daily-2026-09-02/seal.json");
  });
});

describe("loadGithubPack", () => {
  it("picks the newest day WITH a verified seal, skipping unsealed newer days", async () => {
    const repo = baseRepo();
    repo["data/_seals/2026-09-02.json"] = JSON.stringify(seal0902);
    const r = await loadGithubPack(SPEC, { token: "ghp_test", fetchImpl: fakeFetch(repo) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.day).toBe("2026-09-02");
    expect(r.sealPath).toBe("data/_seals/2026-09-02.json");
    expect(r.pack.suppliers.map((s) => s.externalId)).toEqual(["posco"]);
    expect(r.days).toEqual([
      { day: "2026-09-04", sealed: false, reason: "no seal found (seal.json / _*/ *.json)", sealPath: null },
      { day: "2026-09-03", sealed: false, reason: "no seal found (seal.json / _*/ *.json)", sealPath: null },
      { day: "2026-09-02", sealed: true, reason: null, sealPath: "data/_seals/2026-09-02.json" },
    ]);
  });

  it("takes 2026-09-03 once its seal exists under _seals/, maps VM image paths to packfile refs and the manifest", async () => {
    const repo = baseRepo();
    repo["data/_seals/2026-09-03.json"] = JSON.stringify(seal0903);
    repo["data/_seals/2026-09-02.json"] = JSON.stringify(seal0902);
    const r = await loadGithubPack(SPEC, { token: "ghp_test", fetchImpl: fakeFetch(repo) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.day).toBe("2026-09-03");
    expect(r.source).toBe("github:mboughou123/suplymate.com@cursor/amine-review-nav-mate-ctas-83a7:data/daily-2026-09-03");
    expect(r.seal.held).toEqual([{ key: "bossard", reason: "distributor/logistics identity — not a mill seal" }]);
    const thk = r.pack.suppliers.find((s) => s.externalId === "thk")!;
    expect(thk.photoUrls).toEqual(["packfile:images/suppliers/thk/thk_01.jpg", "packfile:images/suppliers/thk/thk_02.jpg"]);
    expect(r.pack.products[0].imageUrls).toEqual(["packfile:images/products/amcor/amlite-heatready-local.jpg"]);
    expect(r.files.manifestFor("images/products/amcor/amlite-heatready-local.jpg")).toBe("enhanced/products/amcor/amlite-heatready-local.jpg");
    // Only 2026-09-03 was fetched (no needless downloads of older days).
    expect(calls.filter((u) => u.includes("daily-2026-09-02"))).toEqual([]);
  });

  it("refuses a seal whose hashes do not match the committed JSON (revised pack, stale seal)", async () => {
    const repo = baseRepo();
    repo["data/_seals/2026-09-03.json"] = JSON.stringify({ ...seal0903, sha256: { "suppliers.json": sha256Hex("older revision") } });
    const r = await loadGithubPack(SPEC, { token: "ghp_test", fetchImpl: fakeFetch(repo) });
    expect(r).toMatchObject({ ok: false, skipped: "unsealed" });
    if (r.ok) return;
    expect(r.days.find((d) => d.day === "2026-09-03")).toMatchObject({ sealed: false, reason: "sha256 mismatch for suppliers.json", sealPath: "data/_seals/2026-09-03.json" });
  });

  it("refuses researcherOk=false and day-mismatched seals; reports no_pack when nothing is there", async () => {
    const repo = baseRepo();
    repo["data/daily-2026-09-03-seal.json"] = JSON.stringify({ ...seal0903, researcherOk: false });
    repo["data/_qa/ok.json"] = JSON.stringify({ ...seal0902, day: "2026-09-01" });
    const r = await loadGithubPack(SPEC, { token: "ghp_test", fetchImpl: fakeFetch(repo) });
    expect(r).toMatchObject({ ok: false, skipped: "unsealed" });
    if (r.ok) return;
    expect(r.days.find((d) => d.day === "2026-09-03")?.reason).toMatch(/not Researcher-approved/);
    expect(r.days.find((d) => d.day === "2026-09-02")?.reason).toMatch(/no seal found/);

    const empty = await loadGithubPack(SPEC, { token: "ghp_test", fetchImpl: fakeFetch({ "README.md": "x" }) });
    expect(empty).toMatchObject({ ok: false, skipped: "no_pack" });
  });

  it("pins to a requested day", async () => {
    const repo = baseRepo();
    repo["data/_seals/2026-09-03.json"] = JSON.stringify(seal0903);
    repo["data/_seals/2026-09-02.json"] = JSON.stringify(seal0902);
    const r = await loadGithubPack(SPEC, { token: "ghp_test", fetchImpl: fakeFetch(repo), day: "2026-09-02" });
    expect(r.ok && r.day).toBe("2026-09-02");
  });

  it("surfaces auth problems on the tree call", async () => {
    const denied = (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch;
    await expect(loadGithubPack(SPEC, { token: null, fetchImpl: denied })).rejects.toThrow(/HTTP 401 \(set GITHUB_TOKEN\)/);
  });
});

describe("GithubPackFiles.prefetch", () => {
  it("resolves relative refs to public/images/** in the tree; manifest dst ⇒ pre-enhanced", async () => {
    const repo = baseRepo();
    const paths = new Set(Object.keys(repo));
    const client = new GithubClient(SPEC, "ghp_test", fakeFetch(repo));
    const files = new GithubPackFiles(client, paths, "data", "2026-09-03");
    files.addManifest(JSON.parse(manifest0903));

    await files.prefetch(["packfile:images/products/amcor/amlite-heatready-local.jpg", "packfile:images/suppliers/thk/thk_01.jpg", "packfile:images/suppliers/nope/missing.jpg"]);
    const product = files.resolve("packfile:images/products/amcor/amlite-heatready-local.jpg");
    expect(product).toMatchObject({ preEnhanced: true, file: { path: "enhanced/products/amcor/amlite-heatready-local.jpg" } });
    expect(product?.file.buffer.equals(JPEG)).toBe(true);
    const thk = files.resolve("packfile:images/suppliers/thk/thk_01.jpg");
    expect(thk).toMatchObject({ preEnhanced: false, file: { path: "images/suppliers/thk/thk_01.jpg" } });
    expect(files.resolve("packfile:images/suppliers/nope/missing.jpg")).toBeNull();
    expect(files.missing).toEqual(["images/suppliers/nope/missing.jpg"]);

    // Next batch releases the previous one.
    await files.prefetch(["packfile:images/suppliers/thk/thk_02.jpg"]);
    expect(files.resolve("packfile:images/suppliers/thk/thk_01.jpg")).toBeNull();
    expect(files.resolve("packfile:images/suppliers/thk/thk_02.jpg")).not.toBeNull();
  });

  it("prefers the day folder's enhanced/ copy when the tree has one", async () => {
    const repo = baseRepo();
    repo["data/daily-2026-09-03/enhanced/suppliers/thk/thk_01.jpg"] = Buffer.concat([JPEG, Buffer.from([1])]);
    const client = new GithubClient(SPEC, "ghp_test", fakeFetch(repo));
    const files = new GithubPackFiles(client, new Set(Object.keys(repo)), "data", "2026-09-03");
    await files.prefetch(["packfile:images/suppliers/thk/thk_01.jpg"]);
    const r = files.resolve("packfile:images/suppliers/thk/thk_01.jpg");
    expect(r?.preEnhanced).toBe(true);
    expect(r?.file.buffer.byteLength).toBe(JPEG.byteLength + 1);
  });
});

describe("runDailyImport with IMPORT_GITHUB_PACK", () => {
  it("dry-run: imports the sealed 2026-09-03 day, holds Bossard, resolves stills from the tree", async () => {
    const repo = baseRepo();
    repo["data/_seals/2026-09-03.json"] = JSON.stringify(seal0903);
    const summary = await runDailyImport({ trigger: "cron", githubPack: SPEC, fetchImpl: fakeFetch(repo), dryRun: true, grok: false, actor: "vercel-cron" });

    expect(summary.ok).toBe(true);
    expect(summary.skipped).toBeUndefined();
    expect(summary.day).toBe("2026-09-03");
    expect(summary.sources).toEqual(["inline:github:mboughou123/suplymate.com@cursor/amine-review-nav-mate-ctas-83a7:data/daily-2026-09-03"]);
    expect(summary.seal).toMatchObject({ day: "2026-09-03", researcherOk: true, approvedBy: "Researcher", holds: 1, sealed: 0, path: "data/_seals/2026-09-03.json" });
    expect(summary.github?.days.map((d) => [d.day, d.sealed])).toEqual([
      ["2026-09-04", false],
      ["2026-09-03", true],
    ]);
    expect(summary.held).toEqual([
      expect.objectContaining({ kind: "supplier", id: "bossard", name: "Bossard Group", reason: "distributor/logistics identity — not a mill seal", source: "seal" }),
    ]);
    expect(summary.pack).toMatchObject({ suppliers: 2, products: 1 });
    // THK + a minimal pending Amcor (owner of the product, not in this pack); Bossard never counted.
    expect(summary.suppliers).toMatchObject({ seen: 1, created: 2 });
    expect(summary.products).toMatchObject({ seen: 1, created: 1 });
    // 2 THK stills (originals) + 1 Amcor still (manifest dst ⇒ enhanced), Bossard's still never fetched.
    expect(summary.media).toMatchObject({ imported: 3, enhanced: 1, deferred: 0, failed: 0 });
    expect(calls.some((u) => u.includes("bossard_01.jpg"))).toBe(false);
    // Dry runs never touch the ledger.
    expect(tables.mediaAuditLog.filter((r) => r.action === "import_day")).toHaveLength(0);
  });

  it("real run: writes pending suppliers/products, stores stills, records the day; the next run is a no-op", async () => {
    const repo = baseRepo();
    repo["data/_seals/2026-09-03.json"] = JSON.stringify(seal0903);
    const first = await runDailyImport({ trigger: "cron", githubPack: SPEC, fetchImpl: fakeFetch(repo), grok: false, actor: "vercel-cron" });
    expect(first.ok).toBe(true);
    expect(first.skipped).toBeUndefined();
    expect(first.suppliers.created).toBe(2); // THK + minimal pending Amcor
    expect(first.products.created).toBe(1);
    expect(first.media).toMatchObject({ imported: 3, enhanced: 1, failed: 0 });
    expect(first.held.map((h) => h.id)).toEqual(["bossard"]);
    expect(tables.supplier.some((s) => s.id === "bossard")).toBe(false);
    expect(tables.supplier.find((s) => s.id === "thk")).toMatchObject({ verificationStatus: "pending" });
    expect(tables.media.filter((m) => String(m.originalUrl).startsWith("packfile:"))).toHaveLength(3);
    expect(tables.media.find((m) => String(m.originalUrl).includes("amlite"))?.storageKey).toMatch(/\/enhanced\//);
    const ledger = tables.mediaAuditLog.filter((r) => r.action === "import_day" && r.entityType === "IMPORT_DAY" && r.entityId === "2026-09-03");
    expect(ledger).toHaveLength(1);
    expect(ledger[0].adminUser).toBe("vercel-cron");
    expect(JSON.parse(String(ledger[0].detail))).toMatchObject({ source: "github", part: 1, of: 1, held: 1 });

    const second = await runDailyImport({ trigger: "cron", githubPack: SPEC, fetchImpl: fakeFetch(repo), grok: false, actor: "vercel-cron" });
    expect(second.skipped).toBe("already_imported");
    expect(second.day).toBe("2026-09-03");
    expect(second.suppliers.created).toBe(0);
    expect(tables.mediaAuditLog.filter((r) => r.action === "import_day")).toHaveLength(1);
  });

  it("no sealed day → skipped: unsealed; nothing configured → no_source_configured", async () => {
    const unsealed = await runDailyImport({ trigger: "cron", githubPack: SPEC, fetchImpl: fakeFetch(baseRepo()), grok: false });
    expect(unsealed).toMatchObject({ ok: true, skipped: "unsealed" });
    expect(unsealed.warnings.some((w) => /no sealed day/.test(w))).toBe(true);
    expect(unsealed.github?.days.every((d) => !d.sealed)).toBe(true);

    const none = await runDailyImport({ trigger: "cron", githubPack: null, grok: false });
    expect(none.skipped).toBe("no_source_configured");
  });

  it("reads IMPORT_GITHUB_PACK from the environment and a `day` query pin via optionsFromBody", async () => {
    vi.stubEnv("IMPORT_GITHUB_PACK", "mboughou123/suplymate.com@cursor/amine-review-nav-mate-ctas-83a7:data");
    const repo = baseRepo();
    repo["data/_seals/2026-09-02.json"] = JSON.stringify(seal0902);
    repo["data/_seals/2026-09-03.json"] = JSON.stringify(seal0903);
    vi.resetModules();
    const { optionsFromBody, runDailyImport: run } = await import("@/lib/import/daily-import");
    const opts = optionsFromBody({ day: "2026-09-02", dryRun: "1" });
    expect(opts).toMatchObject({ githubDay: "2026-09-02", dryRun: true });
    const summary = await run({ trigger: "cron", ...opts, fetchImpl: fakeFetch(repo), grok: false });
    expect(summary.day).toBe("2026-09-02");
    expect(summary.suppliers.created).toBe(1);
    expect(optionsFromBody({ github: "0" }).githubPack).toBeNull();
  });
});
