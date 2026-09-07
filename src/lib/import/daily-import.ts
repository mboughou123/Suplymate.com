// Daily import orchestrator — the single code path behind
//   GET  /api/cron/daily-import   (Vercel Cron, 03:00 UTC)
//   POST /api/admin/import/run    (manual admin trigger)
//   npx tsx scripts/daily-import.ts
//
// Per run (bounded by IMPORT_DAILY_LIMIT suppliers and a wall-clock deadline so
// it always finishes inside the function limit):
//   1. Load sources (inline pack / IMPORT_BUNDLE_URL / Outscraper) → ImportPack.
//   2. Suppliers: new ones are saved as PENDING ("listed / pending review");
//      existing ones get a non-destructive merge (fill blanks, append photos and
//      certifications). verificationStatus / marketplaceStatus are never touched
//      by this job — "verified" is a manual admin action only.
//   3. Products: upsert ScrapedProduct by stable id; new rows are "pending",
//      existing rows keep their moderation status.
//   4. Media: Grok curates candidate photos (or URL heuristics), images are
//      downloaded through the SSRF-safe pipeline into Vercel Blob, enhanced via
//      the pluggable enhancer, deduped by URL and stored UNPUBLISHED.
//   5. A structured run summary is logged to the console and persisted as a
//      MediaAuditLog row (action "daily_import") — there is no ImportRun table.
//
// Idempotent: everything upserts by stable external id and skips media that is
// already attached, so the cron can re-run (or resume after a timeout) safely.

import { prisma } from "@/lib/prisma";
import {
  getAdminSupplier,
  listAdminSuppliers,
  saveSuppliers,
  updateSupplier,
  findDuplicates,
  normalizeSupplierInput,
  slugifySupplierId,
  type AdminSupplier,
  type SupplierInput,
} from "@/lib/suppliers-store";
import { normKey } from "@/lib/supplier-normalize";
import { logMediaAudit } from "@/lib/media-store";
import { storageProviderStatus } from "@/lib/image-storage";
import { isXaiConfigured, xaiModel, xaiVisionModel } from "@/lib/xai";
import { dedupeStrings } from "@/lib/supplier-normalize";
import type { ImportPack, PackProduct, PackSupplier, PackCertification } from "./pack-formats";
import { configuredSources, hasAnySource, loadSources } from "./sources";
import {
  curateSupplierPhotos,
  generateProductDescription,
  heuristicPhotoKind,
  summarizeSupplier,
  type CurationResult,
  type PhotoKind,
} from "./grok-curation";
import { enhancerStatus } from "./enhance-image";
import { existingMediaKeys, ingestRemoteImage, IMPORT_ACTOR, type IngestResult } from "./media-ingest";
import { isIngestableRef, isPackFileRef, packFileRelative, type PackFiles } from "./pack-files";
import type { Seal } from "./seal";

/* ------------------------------------------------------------------ */
/* Options + summary                                                   */
/* ------------------------------------------------------------------ */

export const DEFAULT_DAILY_LIMIT = 25;
export const DEFAULT_PRODUCT_LIMIT = 150;
export const DEFAULT_MEDIA_PER_SUPPLIER = 6;
export const DEFAULT_MEDIA_PER_PRODUCT = 3;
/** Leave headroom under the route's maxDuration (300 s). */
export const DEFAULT_DEADLINE_MS = 270_000;

export type DailyImportTrigger = "cron" | "admin" | "cli";

export type DailyImportOptions = {
  trigger: DailyImportTrigger;
  /** Max suppliers processed this run (IMPORT_DAILY_LIMIT). */
  limit?: number;
  productLimit?: number;
  mediaPerSupplier?: number;
  mediaPerProduct?: number;
  dryRun?: boolean;
  /** Run the image enhancer (default true). */
  enhance?: boolean;
  /** Use Grok when configured (default true). */
  grok?: boolean;
  /** Payload handed in directly (admin POST body / CLI file). */
  inline?: ImportPack | null;
  /** Override IMPORT_BUNDLE_URL. */
  bundleUrls?: string[];
  /** Override OUTSCRAPER usage (default: when OUTSCRAPER_API_KEY is set). */
  useOutscraper?: boolean;
  deadlineMs?: number;
  now?: Date;
  fetchImpl?: typeof fetch;
  actor?: string | null;
  /** Base URL for site-relative image paths in packs (IMPORT_PUBLIC_BASE_URL). */
  publicBaseUrl?: string | null;
  /** Uploaded pack files (push mode) that `packfile:` refs resolve against. */
  files?: PackFiles | null;
  /** Verified seal of the pushed day (push mode). */
  seal?: Seal | null;
  /** Pack day + chunk position (push mode). */
  day?: string | null;
  chunk?: { part: number; of: number } | null;
};

export type Counts = { seen: number; created: number; updated: number; skipped: number; failed: number; remaining: number };

export type DailyImportSummary = {
  ok: boolean;
  skipped?: "no_source_configured" | "unsealed" | "already_imported";
  trigger: DailyImportTrigger;
  actor: string;
  started: string;
  finished: string;
  durationMs: number;
  dryRun: boolean;
  /** True when the run stopped at the limit/deadline with work left over. */
  partial: boolean;
  sources: string[];
  limit: number;
  pack?: { label: string; format: string; generatedAt: string | null; suppliers: number; products: number };
  /** Push mode: which day / chunk this run covered and the seal it was gated by. */
  day?: string | null;
  chunk?: { part: number; of: number };
  seal?: { day: string; digest: string; researcherOk: boolean; approvedBy: string | null; approvedAt: string | null; hashedFiles: string[] };
  /** Push mode: files uploaded with this request. */
  uploads?: { files: number; bytes: number };
  suppliers: Counts;
  products: Counts;
  media: {
    candidates: number;
    imported: number;
    enhanced: number;
    skipped: number;
    failed: number;
    /** packfile: refs whose bytes were not in this chunk (expected in another one). */
    deferred: number;
  };
  certifications: { created: number; skipped: number; failed: number };
  grok: {
    configured: boolean;
    model?: string;
    visionModel?: string;
    photosClassified: number;
    descriptions: number;
    summaries: number;
    notes: string[];
  };
  enhancer: { provider: string; configured: boolean; note: string };
  storage: { provider: string; configured: boolean };
  errors: string[];
  warnings: string[];
};

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function emptyCounts(): Counts {
  return { seen: 0, created: 0, updated: 0, skipped: 0, failed: 0, remaining: 0 };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/* ------------------------------------------------------------------ */
/* Supplier merge                                                      */
/* ------------------------------------------------------------------ */

type SupplierPatch = Parameters<typeof updateSupplier>[1];

/**
 * Non-destructive merge of a pack supplier into an existing record: only fills
 * blanks and appends new photos / certifications / product lines. Never touches
 * verification or marketplace status.
 */
export function buildSupplierMergePatch(existing: AdminSupplier, incoming: SupplierInput): SupplierPatch {
  const patch: SupplierPatch = {};
  const fill = <K extends keyof SupplierPatch>(key: K, value: SupplierPatch[K] | null | undefined) => {
    const cur = existing[key as keyof AdminSupplier];
    const isBlank = cur == null || (typeof cur === "string" && !cur.trim());
    if (isBlank && value != null && (typeof value !== "string" || value.trim())) {
      patch[key] = value as SupplierPatch[K];
    }
  };
  fill("description", incoming.description);
  fill("website", incoming.website);
  fill("phone", incoming.phone);
  fill("email", incoming.email);
  fill("address", incoming.address);
  fill("country", incoming.country);
  fill("city", incoming.city);
  fill("category", incoming.category);
  fill("logoUrl", incoming.logoUrl);
  fill("imageUrl", incoming.imageUrl);
  fill("sourceUrl", incoming.sourceUrl);
  if (existing.moq === "Contact for MOQ" && incoming.moq?.trim()) patch.moq = incoming.moq.trim();

  const images = dedupeStrings([...existing.images, ...(incoming.images ?? [])]);
  if (images.length !== existing.images.length) patch.images = images;

  const certImages = dedupeStrings([...existing.certificationImages, ...(incoming.certificationImages ?? [])]);
  if (certImages.length !== existing.certificationImages.length) patch.certificationImages = certImages;

  const products = dedupeStrings([...existing.products, ...(incoming.products ?? [])]);
  if (products.length !== existing.products.length) patch.products = products;

  const known = new Set(existing.certifications.map((c) => c.name.trim().toLowerCase()));
  const newCerts = (incoming.certifications ?? []).filter((c) => c.name && !known.has(c.name.trim().toLowerCase()));
  if (newCerts.length) patch.certifications = [...existing.certifications, ...newCerts];

  return patch;
}

/* ------------------------------------------------------------------ */
/* Certifications                                                      */
/* ------------------------------------------------------------------ */

async function ensureCertificationRow(
  supplierId: string,
  cert: PackCertification,
  dryRun: boolean
): Promise<{ id: string; created: boolean } | null> {
  const name = cert.name.trim().slice(0, 200);
  if (!name) return null;
  if (dryRun) return { id: `dry-${supplierId}-${name}`, created: true };
  const existing = await prisma.certification.findFirst({
    where: { supplierId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };
  const row = await prisma.certification.create({
    data: {
      supplierId,
      name,
      type: cert.type ?? null,
      imageUrl: cert.imageUrl ?? null,
      certificateUrl: cert.certificateUrl ?? null,
      sourceUrl: cert.sourceUrl ?? null,
      // Imported scans are CLAIMED by the source, never "verified" automatically.
      status: "claimed",
    },
    select: { id: true },
  });
  return { id: row.id, created: true };
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

type UpsertProductResult = { id: string; created: boolean; changed: boolean };

async function upsertScrapedProduct(
  p: PackProduct,
  supplier: { id: string; name: string; country: string | null; logoUrl: string | null; verified: boolean },
  description: string | null,
  specs: Record<string, string>,
  dryRun: boolean
): Promise<UpsertProductResult> {
  const category = p.category ?? "Industrial Parts";
  if (dryRun) return { id: p.externalId, created: true, changed: true };

  const existing = await prisma.scrapedProduct.findUnique({ where: { id: p.externalId } });
  if (!existing) {
    await prisma.scrapedProduct.create({
      data: {
        id: p.externalId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierLogo: supplier.logoUrl,
        supplierCountry: supplier.country,
        name: p.name,
        slug: p.slug,
        category,
        images: JSON.stringify(p.imageUrls),
        videos: "[]",
        basePrice: p.price,
        priceUnit: p.priceUnit,
        currency: p.currency ?? "USD",
        moq: p.moq,
        description,
        specifications: JSON.stringify(specs),
        customizationOptions: "[]",
        certifications: "[]",
        sourceUrl: p.sourceUrl,
        productUrl: p.productUrl,
        imageSourceUrl: p.imageUrls[0] ?? null,
        sku: p.sku,
        verifiedSupplier: supplier.verified,
        // Imported products always start in the review queue.
        status: "pending",
      },
    });
    return { id: p.externalId, created: true, changed: true };
  }

  // Existing row: merge images / fill blanks, keep moderation status untouched.
  const parse = (v: string, fb: unknown) => {
    try {
      return JSON.parse(v);
    } catch {
      return fb;
    }
  };
  const curImages: string[] = Array.isArray(parse(existing.images, [])) ? parse(existing.images, []) : [];
  const images = dedupeStrings([...curImages, ...p.imageUrls]);
  const curSpecs = (parse(existing.specifications, {}) ?? {}) as Record<string, string>;
  const mergedSpecs = { ...specs, ...curSpecs };
  const data: Record<string, unknown> = {};
  if (images.length !== curImages.length) data.images = JSON.stringify(images);
  if (!existing.description?.trim() && description) data.description = description;
  if (Object.keys(mergedSpecs).length !== Object.keys(curSpecs).length) data.specifications = JSON.stringify(mergedSpecs);
  if (!existing.productUrl && p.productUrl) data.productUrl = p.productUrl;
  if (!existing.sku && p.sku) data.sku = p.sku;
  if (!existing.priceUnit && p.priceUnit) data.priceUnit = p.priceUnit;
  if (existing.basePrice == null && p.price != null) {
    data.basePrice = p.price;
    if (p.currency) data.currency = p.currency;
  }
  if (!existing.moq && p.moq) data.moq = p.moq;
  if (Object.keys(data).length === 0) return { id: existing.id, created: false, changed: false };
  await prisma.scrapedProduct.update({ where: { id: existing.id }, data });
  return { id: existing.id, created: false, changed: true };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const KIND_TO_MEDIA: Record<PhotoKind, "SUPPLIER_FACTORY" | "SUPPLIER_GALLERY" | "CERTIFICATION" | null> = {
  factory_exterior: "SUPPLIER_FACTORY",
  production_line: "SUPPLIER_FACTORY",
  product: "SUPPLIER_GALLERY",
  certificate: "CERTIFICATION",
  logo: null,
  irrelevant: null,
};

/**
 * Uploaded `enhanced/` stills were already curated by the bot (and Grok vision
 * cannot fetch them), so they are classified from their pack path only and kept
 * first: `enhanced/suppliers/<slug>/…` → factory unless the file name says
 * product; `enhanced/products/…` → product.
 */
function localCuration(refs: string[], keep: number): CurationResult {
  let kept = 0;
  const photos = refs.map((url) => {
    const rel = packFileRelative(url) ?? url;
    let kind = heuristicPhotoKind(rel);
    const file = rel.split("/").pop() ?? rel;
    if (kind === "product" && /(^|\/)suppliers\//i.test(rel) && !/prod|product/i.test(file)) kind = "factory_exterior";
    const importable = kind !== "logo" && kind !== "irrelevant";
    const keepIt = importable && (kind === "certificate" || kept < keep);
    if (keepIt && kind !== "certificate") kept++;
    return { url, kind, quality: 4, keep: keepIt };
  });
  return { photos, source: "heuristic", note: refs.length ? "uploaded enhanced stills kept as pre-curated by the bot" : undefined };
}

export async function runDailyImport(opts: DailyImportOptions): Promise<DailyImportSummary> {
  const startedAt = opts.now ?? new Date();
  const t0 = Date.now();
  const deadline = t0 + (opts.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const limit = opts.limit ?? envInt("IMPORT_DAILY_LIMIT", DEFAULT_DAILY_LIMIT);
  const productLimit = opts.productLimit ?? envInt("IMPORT_DAILY_PRODUCT_LIMIT", DEFAULT_PRODUCT_LIMIT);
  const mediaPerSupplier = opts.mediaPerSupplier ?? envInt("IMPORT_MEDIA_PER_SUPPLIER", DEFAULT_MEDIA_PER_SUPPLIER);
  const mediaPerProduct = opts.mediaPerProduct ?? envInt("IMPORT_MEDIA_PER_PRODUCT", DEFAULT_MEDIA_PER_PRODUCT);
  const dryRun = opts.dryRun ?? false;
  const useGrok = (opts.grok ?? true) && isXaiConfigured();
  const enhance = opts.enhance ?? true;
  const actor = opts.actor ?? IMPORT_ACTOR;
  const fetchImpl = opts.fetchImpl;
  const files = opts.files ?? null;

  const enh = enhancerStatus();
  const store = storageProviderStatus();

  const summary: DailyImportSummary = {
    ok: true,
    trigger: opts.trigger,
    actor,
    started: startedAt.toISOString(),
    finished: startedAt.toISOString(),
    durationMs: 0,
    dryRun,
    partial: false,
    sources: [],
    limit,
    suppliers: emptyCounts(),
    products: emptyCounts(),
    media: { candidates: 0, imported: 0, enhanced: 0, skipped: 0, failed: 0, deferred: 0 },
    certifications: { created: 0, skipped: 0, failed: 0 },
    grok: {
      configured: isXaiConfigured(),
      model: isXaiConfigured() ? xaiModel() : undefined,
      visionModel: isXaiConfigured() ? xaiVisionModel() : undefined,
      photosClassified: 0,
      descriptions: 0,
      summaries: 0,
      notes: [],
    },
    enhancer: { provider: enh.provider, configured: enh.configured, note: enh.note },
    storage: { provider: store.provider, configured: store.configured },
    errors: [],
    warnings: [],
  };
  if (!useGrok) summary.grok.notes.push(opts.grok === false ? "Grok disabled for this run." : "XAI_API_KEY not set — Grok steps skipped.");
  if (opts.day) summary.day = opts.day;
  if (opts.chunk) summary.chunk = { part: opts.chunk.part, of: opts.chunk.of };
  if (opts.seal) {
    summary.seal = {
      day: opts.seal.day,
      digest: opts.seal.digest,
      researcherOk: opts.seal.researcherOk,
      approvedBy: opts.seal.approvedBy,
      approvedAt: opts.seal.approvedAt,
      hashedFiles: Object.keys(opts.seal.sha256),
    };
  }
  if (files) summary.uploads = { files: files.size, bytes: files.totalBytes };
  const timeLeft = () => Date.now() < deadline;

  // Dry-run accounting: what ingest WOULD do with this ref.
  const dryIngest = (url: string) => {
    if (isPackFileRef(url)) {
      const res = files?.resolve(url) ?? null;
      if (!res) {
        summary.media.deferred++;
        return;
      }
      summary.media.imported++;
      if (res.preEnhanced) summary.media.enhanced++;
      return;
    }
    summary.media.imported++;
  };

  // Shared accounting for one ingest result.
  const account = (r: IngestResult, label: string) => {
    if (r.status === "imported") {
      summary.media.imported++;
      if (r.enhanced) summary.media.enhanced++;
    } else if (r.status === "skipped") summary.media.skipped++;
    else if (r.status === "deferred") summary.media.deferred++;
    else {
      summary.media.failed++;
      if (summary.errors.length < 50) summary.errors.push(`${label}: ${r.reason}`);
    }
  };
  // Set when the run could not do its job at all (no source loadable, or every
  // record failed). Individual media failures are reported in `errors` but do
  // not flip `ok`, so a permanently broken image never fails the cron.
  let fatal = false;

  const finish = async (): Promise<DailyImportSummary> => {
    summary.finished = new Date().toISOString();
    summary.durationMs = Date.now() - t0;
    const hardFailures = summary.suppliers.failed + summary.products.failed + summary.certifications.failed;
    const handled =
      summary.suppliers.created + summary.suppliers.updated + summary.suppliers.skipped +
      summary.products.created + summary.products.updated + summary.products.skipped;
    summary.ok = !fatal && !(hardFailures > 0 && handled === 0);
    const line = {
      ok: summary.ok,
      trigger: summary.trigger,
      actor,
      day: summary.day,
      chunk: summary.chunk,
      sealDigest: summary.seal?.digest,
      skipped: summary.skipped,
      partial: summary.partial,
      durationMs: summary.durationMs,
      suppliers: summary.suppliers,
      products: summary.products,
      media: summary.media,
      certifications: summary.certifications,
      grok: { configured: summary.grok.configured, photosClassified: summary.grok.photosClassified, descriptions: summary.grok.descriptions, summaries: summary.grok.summaries },
      enhancer: summary.enhancer.provider,
      errors: summary.errors.length,
    };
    console.info(`[daily-import] ${JSON.stringify(line)}`);
    if (!dryRun && !summary.skipped) {
      await logMediaAudit({
        adminUser: actor,
        action: "daily_import",
        detail: { ...line, sources: summary.sources, errors: summary.errors.slice(0, 20) },
      }).catch(() => undefined);
    }
    return summary;
  };

  /* ---- 1. Sources ---- */
  const cfg = configuredSources();
  const bundleUrls = opts.bundleUrls ?? cfg.bundleUrls;
  const useOutscraper = opts.useOutscraper ?? cfg.outscraper;
  if (!hasAnySource({ bundleUrls, outscraper: useOutscraper }, opts.inline)) {
    summary.skipped = "no_source_configured";
    summary.warnings.push("No import source configured (IMPORT_BUNDLE_URL / OUTSCRAPER_API_KEY) and no inline pack provided.");
    return finish();
  }

  const loaded = await loadSources({
    inline: opts.inline,
    bundleUrls,
    useOutscraper,
    fetchImpl,
    now: startedAt,
    baseUrl: opts.publicBaseUrl,
    outscraperQueriesPerDay: envInt("IMPORT_OUTSCRAPER_QUERIES_PER_DAY", 3),
  });
  summary.sources = loaded.sources;
  summary.errors.push(...loaded.errors);
  summary.warnings.push(...loaded.pack.warnings.slice(0, 50));
  const pack = loaded.pack;
  summary.pack = {
    label: pack.label,
    format: pack.format,
    generatedAt: pack.generatedAt,
    suppliers: pack.suppliers.length,
    products: pack.products.length,
  };
  if (pack.suppliers.length === 0 && pack.products.length === 0) {
    if (loaded.sources.length === 0 && loaded.errors.length > 0) fatal = true;
    return finish();
  }

  /* ---- 2. Suppliers ---- */
  // externalId (pack) → actual supplier id in the DB (dup detection may map a
  // pack supplier onto an existing record with a different id).
  const idMap = new Map<string, string>();
  const supplierCache = new Map<string, AdminSupplier>();
  const processedSuppliers: PackSupplier[] = [];

  const batch = pack.suppliers.slice(0, limit);
  summary.suppliers.seen = pack.suppliers.length;
  summary.suppliers.remaining = Math.max(0, pack.suppliers.length - batch.length);
  if (summary.suppliers.remaining > 0) summary.partial = true;

  // One duplicate pass for the whole batch (by id / website / email / phone / name).
  let dupes = new Map<string, { existingId: string; reason: string }>();
  try {
    const normalized = batch.map((s) => normalizeSupplierInput(s.input));
    const found = await findDuplicates(normalized);
    dupes = new Map([...found.entries()].map(([id, d]) => [id, { existingId: d.existingId, reason: d.reason }]));
  } catch (err) {
    summary.warnings.push(`Duplicate detection unavailable: ${errMsg(err)}`);
  }

  const toCreate: { pack: PackSupplier; input: SupplierInput }[] = [];
  for (const s of batch) {
    if (!timeLeft()) {
      summary.partial = true;
      summary.suppliers.remaining += 1;
      continue;
    }
    const normalizedId = normalizeSupplierInput(s.input).id;
    const dup = dupes.get(normalizedId);
    // A duplicate that points at *another* pack supplier in this batch (not yet
    // saved) is a within-batch duplicate → skip it.
    const targetId = dup?.existingId ?? normalizedId;
    const inBatchOnly = dup && !(await getAdminSupplier(dup.existingId));
    if (inBatchOnly) {
      summary.suppliers.skipped++;
      summary.warnings.push(`Skipped "${s.input.name}": duplicate of "${dup!.existingId}" in the same pack (${dup!.reason}).`);
      continue;
    }

    try {
      const existing = await getAdminSupplier(targetId);
      if (existing) {
        idMap.set(s.externalId, existing.id);
        const patch = buildSupplierMergePatch(existing, s.input);
        if (Object.keys(patch).length === 0) {
          summary.suppliers.skipped++;
          supplierCache.set(existing.id, existing);
        } else if (dryRun) {
          summary.suppliers.updated++;
          supplierCache.set(existing.id, { ...existing, ...patch } as AdminSupplier);
        } else {
          const updated = await updateSupplier(existing.id, patch);
          summary.suppliers.updated++;
          supplierCache.set(existing.id, updated ?? existing);
        }
        processedSuppliers.push(s);
        continue;
      }

      // New supplier → PENDING. Optionally let Grok write a short summary when
      // the source has none.
      const input: SupplierInput = { ...s.input, verificationStatus: "pending" };
      if (useGrok && (!input.description || input.description.trim().length < 40) && timeLeft()) {
        const res = await summarizeSupplier(
          {
            name: input.name,
            country: input.country,
            city: input.city,
            category: input.category,
            website: input.website,
            productLines: s.productLines,
            existingDescription: input.description,
          },
          { fetchImpl }
        );
        if (res.ok) {
          input.description = res.summary;
          summary.grok.summaries++;
        } else if (summary.grok.notes.length < 10) {
          summary.grok.notes.push(`summary(${input.name}): ${res.note}`);
        }
      }
      toCreate.push({ pack: s, input });
    } catch (err) {
      summary.suppliers.failed++;
      summary.errors.push(`supplier ${s.externalId}: ${errMsg(err)}`);
    }
  }

  if (toCreate.length) {
    if (dryRun) {
      for (const { pack: s, input } of toCreate) {
        const n = normalizeSupplierInput(input);
        idMap.set(s.externalId, n.id);
        supplierCache.set(n.id, n);
        processedSuppliers.push(s);
        summary.suppliers.created++;
      }
    } else {
      try {
        const res = await saveSuppliers(
          toCreate.map((c) => c.input),
          { skipDuplicates: true }
        );
        const savedIds = new Set(res.saved.map((s) => s.id));
        for (const { pack: s, input } of toCreate) {
          const n = normalizeSupplierInput(input);
          if (savedIds.has(n.id)) {
            idMap.set(s.externalId, n.id);
            supplierCache.set(n.id, res.saved.find((x) => x.id === n.id)!);
            processedSuppliers.push(s);
            summary.suppliers.created++;
          } else {
            const dup = res.skippedDuplicates.find((d) => d.candidate.id === n.id);
            if (dup) idMap.set(s.externalId, dup.existingId);
            summary.suppliers.skipped++;
          }
        }
      } catch (err) {
        summary.suppliers.failed += toCreate.length;
        summary.errors.push(`saveSuppliers: ${errMsg(err)}`);
      }
    }
  }

  /* ---- 3. Supplier media (logo, curated photos, certification scans) ---- */
  for (const s of processedSuppliers) {
    if (!timeLeft()) {
      summary.partial = true;
      break;
    }
    const supplierId = idMap.get(s.externalId);
    if (!supplierId) continue;
    const sup = supplierCache.get(supplierId);
    const candidates = s.photoUrls.filter((u) => u !== s.logoUrl);
    summary.media.candidates += candidates.length + (s.logoUrl ? 1 : 0);

    let existing: Set<string>;
    try {
      existing = dryRun ? new Set<string>() : await existingMediaKeys("SUPPLIER", supplierId);
    } catch {
      existing = new Set<string>();
    }

    // Logo
    if (s.logoUrl && isIngestableRef(s.logoUrl) && !existing.has(s.logoUrl)) {
      if (dryRun) {
        dryIngest(s.logoUrl);
      } else {
        const r = await ingestRemoteImage({
          url: s.logoUrl,
          files,
          entityType: "SUPPLIER",
          entityId: supplierId,
          mediaType: "SUPPLIER_LOGO",
          kind: "logo",
          isPrimary: true,
          altText: `${s.input.name} logo`,
          existing,
          uploadedBy: actor,
          enhance: false,
        });
        account(r, `logo ${s.externalId}`);
      }
    } else if (s.logoUrl) summary.media.skipped++;

    // Curate photos: uploaded enhanced stills first (pre-curated, path-based
    // kinds), then remote URLs through Grok vision / URL heuristics with the
    // remaining budget.
    const fresh = candidates.filter((u) => !existing.has(u));
    summary.media.skipped += candidates.length - fresh.length;
    const localRefs = fresh.filter(isPackFileRef);
    const remoteRefs = fresh.filter((u) => !isPackFileRef(u));
    const local = localCuration(localRefs, mediaPerSupplier);
    const localKept = local.photos.filter((p) => p.keep && p.kind !== "certificate").length;
    const remoteBudget = Math.max(0, mediaPerSupplier - localKept);
    const remote: CurationResult =
      remoteRefs.length && remoteBudget > 0
        ? await curateSupplierPhotos(
            remoteRefs,
            { supplierName: s.input.name, category: s.input.category, country: s.input.country },
            { keep: remoteBudget, fetchImpl }
          )
        : { photos: remoteRefs.map((url) => ({ url, kind: heuristicPhotoKind(url), quality: 3, keep: false })), source: "heuristic" as const };
    const curation: CurationResult = { photos: [...local.photos, ...remote.photos], source: remote.source, note: remote.note ?? local.note };
    if (curation.source === "grok") summary.grok.photosClassified += remote.photos.length;
    if (curation.note && summary.grok.notes.length < 10) summary.grok.notes.push(`${s.externalId}: ${curation.note}`);

    // Certification candidates = pack certs with images + photos Grok flagged as certificates.
    const certs: PackCertification[] = [...s.certifications];
    const certUrls = new Set(certs.map((c) => c.imageUrl).filter(Boolean) as string[]);
    for (const p of curation.photos) {
      if (p.kind === "certificate" && p.keep && !certUrls.has(p.url)) {
        certs.push({ name: `Certificate scan (${s.input.name})`, imageUrl: p.url, sourceUrl: s.input.website ?? s.input.sourceUrl ?? null });
        certUrls.add(p.url);
      }
    }

    let order = 0;
    for (const p of curation.photos) {
      if (!timeLeft()) break;
      if (!p.keep) {
        summary.media.skipped++;
        continue;
      }
      const mediaType = KIND_TO_MEDIA[p.kind];
      if (!mediaType || mediaType === "CERTIFICATION") continue;
      if (dryRun) {
        dryIngest(p.url);
        continue;
      }
      const sortOrder = order++;
      const r = await ingestRemoteImage({
        url: p.url,
        files,
        entityType: "SUPPLIER",
        entityId: supplierId,
        mediaType,
        kind: "photo",
        sortOrder,
        isPrimary: sortOrder === 0 && mediaType === "SUPPLIER_FACTORY",
        altText: `${s.input.name} — ${p.kind.replace("_", " ")}`,
        caption: p.note ?? null,
        existing,
        uploadedBy: actor,
        enhance,
      });
      account(r, `photo ${s.externalId}`);
    }

    // Certification rows + scans.
    const legacyCertUrls: string[] = [];
    for (const cert of certs) {
      if (!timeLeft()) break;
      try {
        const row = await ensureCertificationRow(supplierId, cert, dryRun);
        if (!row) continue;
        if (row.created) summary.certifications.created++;
        else summary.certifications.skipped++;
        if (!isIngestableRef(cert.imageUrl)) continue;
        if (!isPackFileRef(cert.imageUrl)) legacyCertUrls.push(cert.imageUrl);
        if (dryRun) {
          dryIngest(cert.imageUrl);
          continue;
        }
        const certExisting = await existingMediaKeys("CERTIFICATION", row.id);
        const r = await ingestRemoteImage({
          url: cert.imageUrl,
          files,
          entityType: "CERTIFICATION",
          entityId: row.id,
          mediaType: "CERTIFICATION",
          kind: "certificate",
          isPrimary: true,
          altText: `${s.input.name} — ${cert.name}`,
          existing: certExisting,
          uploadedBy: actor,
          enhance,
        });
        account(r, `cert ${s.externalId}`);
        // The legacy JSON field needs a servable URL — for uploaded scans that
        // is the stored Blob URL.
        if (isPackFileRef(cert.imageUrl) && r.status === "imported" && r.media?.url) legacyCertUrls.push(r.media.url);
      } catch (err) {
        summary.certifications.failed++;
        if (summary.errors.length < 50) summary.errors.push(`certification ${s.externalId}/${cert.name}: ${errMsg(err)}`);
      }
    }
    // Keep the legacy JSON field in sync so existing profile UI sees the scans.
    if (!dryRun && legacyCertUrls.length && sup) {
      const merged = dedupeStrings([...sup.certificationImages, ...legacyCertUrls]);
      if (merged.length !== sup.certificationImages.length) {
        await updateSupplier(supplierId, { certificationImages: merged }).catch(() => null);
      }
    }
  }

  /* ---- 4. Products ---- */
  const productBatch = pack.products.slice(0, productLimit);
  summary.products.seen = pack.products.length;
  summary.products.remaining = Math.max(0, pack.products.length - productBatch.length);
  if (summary.products.remaining > 0) summary.partial = true;

  // Lazy name index over existing suppliers so a product whose
  // `supplier_slug_guess` differs from the stored id (e.g. "arabian-pipes" vs
  // "arabian-pipes-company") still attaches to the right mill.
  let nameIndex: Map<string, string> | null = null;
  const resolveSupplierByName = async (name: string): Promise<string | null> => {
    if (!nameIndex) {
      nameIndex = new Map();
      try {
        for (const s of await listAdminSuppliers()) {
          const k = normKey(s.name);
          if (k) nameIndex.set(k, s.id);
          nameIndex.set(slugifySupplierId(s.name), s.id);
        }
      } catch {
        // no DB — index stays empty
      }
    }
    return nameIndex.get(normKey(name) ?? "") ?? nameIndex.get(slugifySupplierId(name)) ?? null;
  };

  for (const p of productBatch) {
    if (!timeLeft()) {
      summary.partial = true;
      summary.products.remaining++;
      continue;
    }
    try {
      // Resolve the owning supplier: processed this run → existing in DB (by id,
      // then by name) → create a minimal pending one.
      let supplierId = idMap.get(p.supplierExternalId);
      let sup = supplierId ? supplierCache.get(supplierId) : undefined;
      if (!sup) {
        const byId = await getAdminSupplier(supplierId ?? p.supplierExternalId);
        const byNameId = byId ? null : await resolveSupplierByName(p.supplierName);
        const found = byId ?? (byNameId ? await getAdminSupplier(byNameId) : null);
        if (found) {
          sup = found;
          supplierId = found.id;
          idMap.set(p.supplierExternalId, found.id);
          supplierCache.set(found.id, found);
        }
      }
      if (!sup) {
        if (summary.suppliers.created + summary.suppliers.updated + summary.suppliers.skipped >= limit + 5) {
          summary.products.skipped++;
          summary.partial = true;
          continue;
        }
        const minimal: SupplierInput = {
          id: p.supplierExternalId,
          name: p.supplierName,
          category: p.category,
          sourceUrl: p.sourceUrl,
          products: [p.name],
          verificationStatus: "pending",
        };
        if (dryRun) {
          sup = normalizeSupplierInput(minimal);
        } else {
          const res = await saveSuppliers([minimal], { skipDuplicates: true });
          sup = res.saved[0] ?? (res.skippedDuplicates[0] ? await getAdminSupplier(res.skippedDuplicates[0].existingId) : null) ?? undefined;
        }
        if (!sup) {
          summary.products.failed++;
          summary.errors.push(`product ${p.externalId}: could not resolve supplier "${p.supplierName}"`);
          continue;
        }
        supplierId = sup.id;
        idMap.set(p.supplierExternalId, sup.id);
        supplierCache.set(sup.id, sup);
        summary.suppliers.created++;
      }
      supplierId = supplierId ?? sup.id;

      // Grok product copy when the pack has none.
      let description = p.description;
      let specs = { ...p.specifications };
      if (useGrok && !description && timeLeft()) {
        const res = await generateProductDescription(
          {
            name: p.name,
            supplierName: sup.name,
            category: p.category,
            attributes: { ...p.specifications, ...(p.priceNote ? { price_note: p.priceNote } : {}), ...(p.moq ? { moq: p.moq } : {}) },
            sourceUrl: p.sourceUrl,
          },
          { fetchImpl }
        );
        if (res.ok) {
          description = res.description;
          if (Object.keys(specs).length === 0) {
            res.specs.forEach((line, i) => (specs[`Spec ${i + 1}`] = line));
          }
          summary.grok.descriptions++;
        } else if (summary.grok.notes.length < 10) {
          summary.grok.notes.push(`description(${p.slug}): ${res.note}`);
        }
      }
      if (p.priceNote && !specs["Pricing"]) specs = { ...specs, Pricing: p.priceNote };

      const up = await upsertScrapedProduct(
        p,
        { id: supplierId, name: sup.name, country: sup.country, logoUrl: sup.logoUrl, verified: sup.verified },
        description,
        specs,
        dryRun
      );
      if (up.created) summary.products.created++;
      else if (up.changed) summary.products.updated++;
      else summary.products.skipped++;

      // Product images (first = primary).
      const imgs = p.imageUrls.slice(0, mediaPerProduct);
      summary.media.candidates += imgs.length;
      if (imgs.length === 0) continue;
      const existing = dryRun ? new Set<string>() : await existingMediaKeys("PRODUCT", up.id);
      let first = true;
      for (const url of imgs) {
        if (!timeLeft()) break;
        if (existing.has(url)) {
          summary.media.skipped++;
          first = false;
          continue;
        }
        if (dryRun) {
          dryIngest(url);
          first = false;
          continue;
        }
        const r = await ingestRemoteImage({
          url,
          files,
          entityType: "PRODUCT",
          entityId: up.id,
          mediaType: first ? "PRODUCT_PRIMARY" : "PRODUCT_GALLERY",
          kind: "photo",
          isPrimary: first,
          altText: `${p.name} — ${sup.name}`,
          existing,
          uploadedBy: actor,
          enhance,
        });
        first = false;
        account(r, `product image ${p.externalId}`);
      }
    } catch (err) {
      summary.products.failed++;
      if (summary.errors.length < 50) summary.errors.push(`product ${p.externalId}: ${errMsg(err)}`);
    }
  }

  return finish();
}

/** Parse the JSON body accepted by the admin/cron routes into run options. */
export function optionsFromBody(body: Record<string, unknown> | null | undefined): Partial<DailyImportOptions> {
  const out: Partial<DailyImportOptions> = {};
  if (!body) return out;
  // Multipart pushes deliver every option as a string.
  const int = (v: unknown) => {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
  };
  const bool = (v: unknown) => (typeof v === "boolean" ? v : typeof v === "string" ? /^(1|true|yes)$/i.test(v) : undefined);
  const limit = int(body.limit);
  if (limit) out.limit = Math.min(limit, 500);
  const productLimit = int(body.productLimit);
  if (productLimit) out.productLimit = Math.min(productLimit, 2000);
  const dry = bool(body.dryRun);
  if (dry !== undefined) out.dryRun = dry;
  const enhance = bool(body.enhance);
  if (enhance !== undefined) out.enhance = enhance;
  const grok = bool(body.grok);
  if (grok !== undefined) out.grok = grok;
  const outscraper = bool(body.outscraper);
  if (outscraper !== undefined) out.useOutscraper = outscraper;
  if (typeof body.bundleUrl === "string" && body.bundleUrl.trim()) out.bundleUrls = [body.bundleUrl.trim()];
  if (Array.isArray(body.bundleUrls)) out.bundleUrls = body.bundleUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  return out;
}

export type { ImportPack };
