// Outscraper (Google Maps public business listings) HTTP client.
//
// Extracted from scripts/outscraper/fetch.ts so the daily import job on Vercel
// and the CLI script share one implementation. Only PUBLIC business data is
// requested. Respect the Outscraper plan's credits — the daily job only runs a
// small rotating slice of the query matrix (see `dailyQuerySlice`).

import { buildQueries, type SupplierCategory } from "./queries";
import type { CacheEntry, RawPlace } from "./normalize";

export const OUTSCRAPER_API = "https://api.outscraper.com/maps/search-v3";

export function isOutscraperConfigured(): boolean {
  return Boolean(process.env.OUTSCRAPER_API_KEY?.trim());
}

export type OutscraperJob = { query: string; category: SupplierCategory };

/** One Outscraper Maps search. Throws on HTTP errors (message never includes the key). */
export async function fetchOutscraperQuery(
  apiKey: string,
  query: string,
  limit: number,
  fetchImpl: typeof fetch = fetch
): Promise<RawPlace[]> {
  const url =
    `${OUTSCRAPER_API}?query=${encodeURIComponent(query)}` +
    `&limit=${limit}&async=false&dropDuplicates=true&language=en`;

  const res = await fetchImpl(url, {
    headers: { "X-API-KEY": apiKey },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Outscraper ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: unknown };
  const data = (json.data ?? []) as unknown[];
  // v3 returns array-of-arrays for multi-query requests, but a flat array of
  // place objects for a single query. Handle both.
  if (Array.isArray(data[0])) return data[0] as RawPlace[];
  return data as RawPlace[];
}

/**
 * Pick a deterministic, rotating slice of the query matrix for a given day so
 * a daily run covers the whole matrix over time without re-spending credits on
 * the same searches every night.
 */
export function dailyQuerySlice(
  date: Date,
  perDay: number,
  limitPerQuery = 20
): OutscraperJob[] {
  const { jobs } = buildQueries(limitPerQuery);
  if (jobs.length === 0 || perDay <= 0) return [];
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  const start = (dayIndex * perDay) % jobs.length;
  const out: OutscraperJob[] = [];
  for (let i = 0; i < Math.min(perDay, jobs.length); i++) {
    out.push(jobs[(start + i) % jobs.length]);
  }
  return out;
}

/**
 * Run a set of jobs sequentially (polite spacing) and return cache entries in
 * the same shape `scripts/outscraper/fetch.ts` writes to disk, so
 * `normalizeCache` can consume both.
 */
export async function fetchOutscraperJobs(
  apiKey: string,
  jobs: OutscraperJob[],
  opts: { limit?: number; delayMs?: number; fetchImpl?: typeof fetch; onError?: (q: string, e: Error) => void } = {}
): Promise<CacheEntry[]> {
  const limit = opts.limit ?? 20;
  const entries: CacheEntry[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const { query, category } = jobs[i];
    try {
      const places = await fetchOutscraperQuery(apiKey, query, limit, opts.fetchImpl);
      entries.push({ category, query, places });
    } catch (err) {
      opts.onError?.(query, err as Error);
    }
    if (i < jobs.length - 1 && (opts.delayMs ?? 1200) > 0) {
      await new Promise((r) => setTimeout(r, opts.delayMs ?? 1200));
    }
  }
  return entries;
}
