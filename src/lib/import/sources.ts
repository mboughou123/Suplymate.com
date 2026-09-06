// Source resolution for the daily import.
//
// Sources, in priority order (all optional — none configured ⇒ the job is a
// clean no-op that reports `skipped: "no_source_configured"`):
//
//   • inline pack      — payload handed to the orchestrator directly (admin
//                        POST body, CLI --file). Used by the Grok Bot when it
//                        POSTs its finished pack to /api/admin/import/run.
//   • IMPORT_BUNDLE_URL — comma/newline-separated public URL(s) of a Lister daily
//                        pack (suppliers.json / products.json), a SupplierBundle
//                        JSON or a supplier CSV. Point this at the Grok Bot's
//                        output (raw GitHub URL, Blob, Drive export…).
//   • OUTSCRAPER_API_KEY — live Google-Maps business listings via Outscraper;
//                        a small rotating slice of the query matrix per day.

import { validateRemoteUrl } from "@/lib/media-fetch";
import { parseImportPayload, mergePacks, type ImportPack, type PackSupplier } from "./pack-formats";
import {
  isOutscraperConfigured,
  dailyQuerySlice,
  fetchOutscraperJobs,
} from "./outscraper/client";
import { normalizeCache, type SupplierRecord } from "./outscraper/normalize";

export const MAX_BUNDLE_BYTES = 25 * 1024 * 1024; // 25 MB

export type SourceConfig = {
  bundleUrls: string[];
  outscraper: boolean;
};

export function parseBundleUrlList(v: string | undefined | null): string[] {
  return (v ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function configuredSources(env: NodeJS.ProcessEnv = process.env): SourceConfig {
  return {
    bundleUrls: parseBundleUrlList(env.IMPORT_BUNDLE_URL),
    outscraper: Boolean(env.OUTSCRAPER_API_KEY?.trim()),
  };
}

export function hasAnySource(cfg: SourceConfig, inline?: ImportPack | null): boolean {
  return Boolean(inline) || cfg.bundleUrls.length > 0 || cfg.outscraper;
}

/* ------------------------------------------------------------------ */
/* Bundle URL                                                          */
/* ------------------------------------------------------------------ */

export async function fetchBundleFromUrl(
  url: string,
  opts: { fetchImpl?: typeof fetch; baseUrl?: string | null } = {}
): Promise<ImportPack> {
  const v = validateRemoteUrl(url);
  if (!v.ok) throw new Error(`IMPORT_BUNDLE_URL rejected (${v.error}): ${url}`);

  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(v.url.toString(), {
    headers: { Accept: "application/json, text/csv, text/plain;q=0.9, */*;q=0.5", "User-Agent": "SuplymateImportBot/1.0" },
    signal: AbortSignal.timeout(45_000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Bundle URL returned HTTP ${res.status}: ${url}`);
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_BUNDLE_BYTES) throw new Error(`Bundle exceeds ${MAX_BUNDLE_BYTES / 1024 / 1024} MB: ${url}`);
  const text = await res.text();
  if (text.length > MAX_BUNDLE_BYTES) throw new Error(`Bundle exceeds ${MAX_BUNDLE_BYTES / 1024 / 1024} MB: ${url}`);

  const label = (() => {
    try {
      return decodeURIComponent(v.url.pathname.split("/").pop() || v.url.hostname);
    } catch {
      return v.url.hostname;
    }
  })();
  return parseImportPayload(text, {
    label,
    baseUrl: opts.baseUrl,
    contentType: res.headers.get("content-type"),
  });
}

/* ------------------------------------------------------------------ */
/* Outscraper                                                          */
/* ------------------------------------------------------------------ */

export function outscraperRecordToPackSupplier(r: SupplierRecord): PackSupplier {
  const photoUrls = [...new Set([r.imageUrl, ...(r.images ?? [])].filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u))))];
  return {
    externalId: r.id,
    input: {
      id: r.id,
      name: r.name,
      industry: r.industry,
      category: r.category,
      location: r.location,
      country: r.country,
      city: r.city,
      address: r.address,
      website: r.website,
      phone: r.phone,
      email: r.email,
      description: r.description,
      logoUrl: r.logoUrl,
      imageUrl: r.imageUrl,
      images: photoUrls,
      products: r.products,
      deliveryRegions: r.deliveryRegions,
      moq: r.moq,
      rating: r.googleRating,
      reviewCount: r.googleReviews,
      sourceUrl: r.sourceUrl,
      // Outscraper's own `verified` flag is a Google-listing signal, NOT a
      // Suplymate verification. Imported rows always land as pending.
      verificationStatus: "pending",
    },
    photoUrls,
    logoUrl: r.logoUrl,
    certifications: [],
    productLines: r.products,
    sourceFormat: "outscraper",
  };
}

export async function fetchOutscraperPack(opts: {
  now?: Date;
  queriesPerDay?: number;
  limitPerQuery?: number;
  fetchImpl?: typeof fetch;
  delayMs?: number;
}): Promise<ImportPack> {
  const apiKey = process.env.OUTSCRAPER_API_KEY?.trim();
  if (!apiKey) throw new Error("OUTSCRAPER_API_KEY not configured");
  const jobs = dailyQuerySlice(opts.now ?? new Date(), opts.queriesPerDay ?? 3, opts.limitPerQuery ?? 20);
  const warnings: string[] = [];
  const entries = await fetchOutscraperJobs(apiKey, jobs, {
    limit: opts.limitPerQuery ?? 20,
    delayMs: opts.delayMs,
    fetchImpl: opts.fetchImpl,
    onError: (q, e) => warnings.push(`Outscraper "${q}": ${e.message}`),
  });
  const { records, stats } = normalizeCache(entries);
  return {
    format: "outscraper",
    label: `outscraper (${jobs.map((j) => j.query).join("; ")})`,
    generatedAt: new Date().toISOString(),
    suppliers: records.map(outscraperRecordToPackSupplier),
    products: [],
    warnings: [...warnings, `Outscraper: found ${stats.found}, rejected ${stats.rejected}, deduped ${stats.deduped}.`],
  };
}

/* ------------------------------------------------------------------ */
/* Load everything                                                     */
/* ------------------------------------------------------------------ */

export type LoadSourcesOptions = {
  inline?: ImportPack | null;
  bundleUrls?: string[];
  useOutscraper?: boolean;
  fetchImpl?: typeof fetch;
  now?: Date;
  baseUrl?: string | null;
  outscraperQueriesPerDay?: number;
};

export type LoadedSources = {
  pack: ImportPack;
  sources: string[];
  errors: string[];
};

export async function loadSources(opts: LoadSourcesOptions): Promise<LoadedSources> {
  const packs: ImportPack[] = [];
  const sources: string[] = [];
  const errors: string[] = [];

  if (opts.inline) {
    packs.push(opts.inline);
    sources.push(`inline:${opts.inline.label}`);
  }

  for (const url of opts.bundleUrls ?? []) {
    try {
      const pack = await fetchBundleFromUrl(url, { fetchImpl: opts.fetchImpl, baseUrl: opts.baseUrl });
      packs.push(pack);
      sources.push(`url:${url}`);
    } catch (err) {
      errors.push((err as Error).message);
    }
  }

  if (opts.useOutscraper && isOutscraperConfigured()) {
    try {
      const pack = await fetchOutscraperPack({
        now: opts.now,
        fetchImpl: opts.fetchImpl,
        queriesPerDay: opts.outscraperQueriesPerDay,
      });
      packs.push(pack);
      sources.push("outscraper");
    } catch (err) {
      errors.push(`Outscraper: ${(err as Error).message}`);
    }
  }

  return { pack: mergePacks(packs, sources.join(" + ") || "empty"), sources, errors };
}
