// Material pricing service.
//
//   Suplymate -> PricingProvider -> normalised PriceQuote -> Material +
//   MaterialPricePoint (DB cache) -> charts / AI assistant
//
// Guarantees:
//   - Only catalog materials (src/data/material-catalog.ts) are ever returned.
//   - Every price carries a `source`. Seed values are labelled "seed" and are
//     never described as live.
//   - Provider failures degrade to the last cached value; nothing throws.
//   - Providers are refreshed at most once per `refreshIntervalMs` (default
//     PRICING_CACHE_TTL_MINUTES), also across serverless cold starts: the last
//     refresh time is derived from `Material.lastUpdatedAt` in the DB.

import { prisma } from "@/lib/prisma";
import { materials as seedMaterials, type Material } from "@/data/materials";
import { getCatalogMaterial, isCatalogMaterial } from "@/data/material-catalog";
import { worldPriceIndexProvider } from "@/lib/pricing/providers/worldPriceIndex";
import { metalsApiProvider } from "@/lib/pricing/providers/metalsApi";
import type { PriceCadence, PriceQuote, PricingProvider, PricingStatus } from "@/lib/pricing/types";

// Order matters: the first configured provider wins.
const PROVIDERS: PricingProvider[] = [worldPriceIndexProvider, metalsApiProvider];

const CACHE_TTL_MS = (Number(process.env.PRICING_CACHE_TTL_MINUTES) || 60) * 60_000;
/** Chart history kept on the Material row (also the AI/materials page series). */
const HISTORY_LIMIT = 60;

let lastRefreshAt: Date | null = null;
let lastError: string | null = null;
let refreshing: Promise<boolean> | null = null;

export function activeProvider(): PricingProvider | null {
  return PROVIDERS.find((p) => p.isConfigured()) ?? null;
}

function providerById(id: string): PricingProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

function refreshIntervalFor(provider: PricingProvider): number {
  return provider.refreshIntervalMs ?? CACHE_TTL_MS;
}

export function pricingStatus(): PricingStatus {
  const provider = activeProvider();
  return {
    provider: provider?.id ?? null,
    providerName: provider?.name ?? null,
    attribution: provider?.attribution ?? null,
    cadence: provider ? provider.cadence ?? "daily" : null,
    configured: Boolean(provider),
    supported: provider ? seedMaterials.map((m) => m.id).filter((id) => provider.supports(id)) : [],
    refreshIntervalMinutes: provider ? Math.round(refreshIntervalFor(provider) / 60_000) : null,
    lastRefreshAt: lastRefreshAt?.toISOString() ?? null,
    lastError,
  };
}

export type MaterialWithProvenance = Material & {
  source: string;
  sourceLabel: string;
  isLive: boolean;
  /** "monthly" series have no meaningful 24h change (dailyChange is 0). */
  cadence: PriceCadence;
  /** When Suplymate last fetched the price (ISO). */
  lastUpdatedAt: string | null;
  /**
   * Date of the newest provider observation (ISO) — the period the last chart
   * point belongs to. Monthly benchmarks are published with a lag, so this can
   * be 1–2 months before `lastUpdatedAt`. Null for seed data.
   */
  observedAt: string | null;
  category: string;
};

export function sourceLabelFor(source: string): string {
  if (source === "seed") return "Reference series (seed data — not live)";
  const provider = providerById(source);
  return provider ? `Live from ${provider.attribution}` : `Source: ${source}`;
}

function decorate(m: Material, observedAt: Map<string, Date>): MaterialWithProvenance {
  const source = m.source ?? "seed";
  const isLive = source !== "seed";
  return {
    ...m,
    source,
    sourceLabel: sourceLabelFor(source),
    isLive,
    cadence: providerById(source)?.cadence ?? "daily",
    lastUpdatedAt: m.lastUpdatedAt ?? null,
    observedAt: isLive ? observedAt.get(m.id)?.toISOString() ?? m.lastUpdatedAt ?? null : null,
    category: m.category ?? getCatalogMaterial(m.id)?.industry ?? "metals",
  };
}

/** Newest stored observation per material, in one query. Empty when no DB. */
async function loadLatestObservations(materials: Material[]): Promise<Map<string, Date>> {
  const live = materials.filter((m) => m.source && m.source !== "seed");
  if (live.length === 0) return new Map();
  try {
    const rows = await prisma.materialPricePoint.groupBy({
      by: ["materialId", "source"],
      where: { materialId: { in: live.map((m) => m.id) } },
      _max: { recordedAt: true },
    });
    const out = new Map<string, Date>();
    for (const r of rows) {
      const m = live.find((x) => x.id === r.materialId);
      // Only the rows written by the material's current provider count.
      if (m && r.source === m.source && r._max.recordedAt) out.set(r.materialId, r._max.recordedAt);
    }
    return out;
  } catch {
    return new Map();
  }
}

async function loadFromDb(): Promise<Material[]> {
  try {
    const rows = await prisma.material.findMany({ orderBy: { name: "asc" } });
    if (rows.length === 0) return seedMaterials;
    const byId = new Map(seedMaterials.map((m) => [m.id, m]));
    return rows
      .filter((r) => isCatalogMaterial(r.id))
      .map((r) => {
        const fallback = byId.get(r.id);
        let history: number[] = [];
        try {
          const parsed = JSON.parse(r.history);
          history = Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
        } catch {
          history = fallback?.history ?? [];
        }
        return {
          id: r.id,
          name: r.name,
          symbol: r.symbol,
          currentPrice: r.currentPrice,
          unit: r.unit,
          currency: r.currency,
          dailyChange: r.dailyChange,
          monthlyChange: r.monthlyChange,
          yearlyChange: r.yearlyChange,
          signal: r.signal as Material["signal"],
          history,
          category: r.category ?? fallback?.category,
          source: r.source ?? "seed",
          lastUpdatedAt: r.lastUpdatedAt?.toISOString() ?? null,
        } satisfies Material;
      });
  } catch {
    return seedMaterials;
  }
}

function pct(from: number | undefined, to: number): number {
  if (!from) return 0;
  return Number((((to - from) / from) * 100).toFixed(2));
}

/** Percentage changes derived from a price series (newest last). */
export function changesFromHistory(
  history: number[],
  cadence: PriceCadence,
  previousCurrent: number,
  fallback: { yearlyChange: number },
): { dailyChange: number; monthlyChange: number; yearlyChange: number } {
  const last = history[history.length - 1];
  if (cadence === "monthly") {
    // One point per month: month-over-month from the previous point, 12 back
    // for the yearly figure. There is no daily series, so 24h change is 0.
    return {
      dailyChange: 0,
      monthlyChange: pct(history[history.length - 2], last),
      yearlyChange: history.length > 12 ? pct(history[history.length - 13], last) : fallback.yearlyChange,
    };
  }
  // Daily refreshes: ~22 trading days per month.
  return {
    dailyChange: pct(previousCurrent, last),
    monthlyChange: pct(history[Math.max(0, history.length - 22)], last),
    yearlyChange: history.length > 250 ? pct(history[history.length - 251], last) : fallback.yearlyChange,
  };
}

function parseHistory(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/** Persist quotes into Material + MaterialPricePoint. Never throws. */
export async function applyQuotes(quotes: PriceQuote[]): Promise<void> {
  for (const q of quotes) {
    try {
      const row = await prisma.material.findUnique({ where: { id: q.materialId } });
      if (!row) continue;

      const cadence: PriceCadence = q.cadence ?? providerById(q.source)?.cadence ?? "daily";
      const fetchedAt = q.fetchedAt ?? q.recordedAt;
      const switchingSource = row.source !== q.source;
      const providerHistory = (q.history ?? [])
        .filter((p) => Number.isFinite(p.price) && !Number.isNaN(p.recordedAt.getTime()))
        .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
      let history = parseHistory(row.history);

      if (providerHistory.length && switchingSource) {
        // First time this material is served by this provider: replace the
        // seed / previous-provider series with the provider's own history.
        // No unique index on (materialId, recordedAt) → clear then insert.
        await prisma.materialPricePoint.deleteMany({ where: { materialId: q.materialId, source: q.source } });
        await prisma.materialPricePoint.createMany({
          data: providerHistory.map((p) => ({
            materialId: q.materialId,
            price: p.price,
            currency: q.currency,
            unit: q.unit,
            source: q.source,
            recordedAt: p.recordedAt,
          })),
        });
        history = providerHistory.map((p) => p.price).slice(-HISTORY_LIMIT);
      } else if (providerHistory.length) {
        // Same provider: only append when the newest observation is new
        // (monthly series re-fetched daily must not produce duplicate points).
        const lastStored = await prisma.materialPricePoint.findFirst({
          where: { materialId: q.materialId, source: q.source },
          orderBy: { recordedAt: "desc" },
          select: { recordedAt: true },
        });
        if (!lastStored || q.recordedAt.getTime() > lastStored.recordedAt.getTime()) {
          await prisma.materialPricePoint.create({
            data: {
              materialId: q.materialId,
              price: q.price,
              currency: q.currency,
              unit: q.unit,
              source: q.source,
              recordedAt: q.recordedAt,
            },
          });
          history = [...history, q.price].slice(-HISTORY_LIMIT);
        } else if (history.length) {
          // Same observation, possibly revised value: keep the series length.
          history = [...history.slice(0, -1), q.price];
        } else {
          history = [q.price];
        }
      } else {
        // Point-in-time provider (no history): append every refresh.
        await prisma.materialPricePoint.create({
          data: {
            materialId: q.materialId,
            price: q.price,
            currency: q.currency,
            unit: q.unit,
            source: q.source,
            recordedAt: q.recordedAt,
          },
        });
        history = [...history, q.price].slice(-HISTORY_LIMIT);
      }

      const changes = changesFromHistory(history, cadence, row.currentPrice, { yearlyChange: row.yearlyChange });
      await prisma.material.update({
        where: { id: q.materialId },
        data: {
          currentPrice: q.price,
          unit: q.unit,
          currency: q.currency,
          ...changes,
          history: JSON.stringify(history),
          source: q.source,
          lastUpdatedAt: fetchedAt,
        },
      });
    } catch (err) {
      // keep going with the other quotes
      console.warn(`[pricing] could not store quote for ${q.materialId}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

/**
 * Serverless cold starts reset `lastRefreshAt`. Recover it from the newest
 * `lastUpdatedAt` written by this provider so we don't re-fetch on every boot
 * (World Price Index's free tier is 250 requests / month).
 */
function seedLastRefreshFromDb(provider: PricingProvider, current: Material[]): void {
  if (lastRefreshAt) return;
  let newest = 0;
  for (const m of current) {
    if (m.source !== provider.id || !m.lastUpdatedAt) continue;
    const t = new Date(m.lastUpdatedAt).getTime();
    if (Number.isFinite(t) && t > newest) newest = t;
  }
  if (newest) lastRefreshAt = new Date(newest);
}

/** Refreshes provider prices when stale. Resolves `true` if new data was stored. */
async function refreshIfStale(current: Material[]): Promise<boolean> {
  const provider = activeProvider();
  if (!provider) return false;
  const interval = refreshIntervalFor(provider);
  seedLastRefreshFromDb(provider, current);

  const stale = !lastRefreshAt || Date.now() - lastRefreshAt.getTime() > interval;
  if (!stale) return false;
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const ids = current.map((m) => m.id).filter((id) => provider.supports(id));
      const quotes = await provider.fetchLatest(ids);
      await applyQuotes(quotes);
      lastRefreshAt = new Date();
      lastError = null;
      return quotes.length > 0;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Pricing refresh failed";
      console.warn(`[pricing:${provider.id}] refresh failed — ${lastError}`);
      // Back off, but retry sooner than the full interval for long-interval
      // providers so a transient outage doesn't blank a whole day.
      const backoff = Math.min(interval, CACHE_TTL_MS);
      lastRefreshAt = new Date(Date.now() - (interval - backoff));
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Catalog materials with provenance. Refreshes provider prices when stale. */
export async function getMaterialsWithPricing(): Promise<MaterialWithProvenance[]> {
  const current = await loadFromDb();
  let refreshed = false;
  try {
    refreshed = await refreshIfStale(current);
  } catch {
    refreshed = false;
  }
  const fresh = (refreshed ? await loadFromDb() : current).filter((m) => isCatalogMaterial(m.id));
  const observed = await loadLatestObservations(fresh);
  return fresh.map((m) => decorate(m, observed));
}

export async function getMaterialWithPricing(id: string): Promise<MaterialWithProvenance | null> {
  const all = await getMaterialsWithPricing();
  return all.find((m) => m.id === id) ?? null;
}

/** Stored history points for a material (provider-written), newest last. */
export async function getPriceHistory(
  materialId: string,
  limit = 90,
): Promise<{ price: number; source: string; recordedAt: string }[]> {
  try {
    const rows = await prisma.materialPricePoint.findMany({
      where: { materialId },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
    return rows
      .reverse()
      .map((r) => ({ price: r.price, source: r.source, recordedAt: r.recordedAt.toISOString() }));
  } catch {
    return [];
  }
}
