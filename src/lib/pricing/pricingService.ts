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

import { prisma } from "@/lib/prisma";
import { materials as seedMaterials, type Material } from "@/data/materials";
import { getCatalogMaterial, isCatalogMaterial } from "@/data/material-catalog";
import { metalsApiProvider } from "@/lib/pricing/providers/metalsApi";
import type { PriceQuote, PricingProvider, PricingStatus } from "@/lib/pricing/types";

const PROVIDERS: PricingProvider[] = [metalsApiProvider];

const CACHE_TTL_MS = (Number(process.env.PRICING_CACHE_TTL_MINUTES) || 60) * 60_000;

let lastRefreshAt: Date | null = null;
let lastError: string | null = null;
let refreshing: Promise<void> | null = null;

export function activeProvider(): PricingProvider | null {
  return PROVIDERS.find((p) => p.isConfigured()) ?? null;
}

export function pricingStatus(): PricingStatus {
  const provider = activeProvider();
  return {
    provider: provider?.id ?? null,
    providerName: provider?.name ?? null,
    configured: Boolean(provider),
    supported: provider ? seedMaterials.map((m) => m.id).filter((id) => provider.supports(id)) : [],
    lastRefreshAt: lastRefreshAt?.toISOString() ?? null,
    lastError,
  };
}

export type MaterialWithProvenance = Material & {
  source: string;
  sourceLabel: string;
  isLive: boolean;
  lastUpdatedAt: string | null;
  category: string;
};

function sourceLabelFor(source: string): string {
  if (source === "seed") return "Reference series (seed data — not live)";
  const provider = PROVIDERS.find((p) => p.id === source);
  return provider ? `Live from ${provider.attribution}` : `Source: ${source}`;
}

function decorate(m: Material): MaterialWithProvenance {
  const source = m.source ?? "seed";
  return {
    ...m,
    source,
    sourceLabel: sourceLabelFor(source),
    isLive: source !== "seed",
    lastUpdatedAt: m.lastUpdatedAt ?? null,
    category: m.category ?? getCatalogMaterial(m.id)?.industry ?? "metals",
  };
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

function pct(from: number, to: number): number {
  if (!from) return 0;
  return Number((((to - from) / from) * 100).toFixed(2));
}

async function applyQuotes(quotes: PriceQuote[]): Promise<void> {
  for (const q of quotes) {
    try {
      const row = await prisma.material.findUnique({ where: { id: q.materialId } });
      if (!row) continue;
      let history: number[] = [];
      try {
        history = JSON.parse(row.history);
      } catch {
        history = [];
      }
      const previous = row.currentPrice;
      const nextHistory = [...history.slice(-59), q.price];
      const monthAgo = nextHistory[Math.max(0, nextHistory.length - 22)] ?? previous;
      await prisma.material.update({
        where: { id: q.materialId },
        data: {
          currentPrice: q.price,
          unit: q.unit,
          currency: q.currency,
          dailyChange: pct(previous, q.price),
          monthlyChange: pct(monthAgo, q.price),
          history: JSON.stringify(nextHistory),
          source: q.source,
          lastUpdatedAt: q.recordedAt,
        },
      });
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
    } catch {
      /* keep going with the other quotes */
    }
  }
}

async function refreshIfStale(current: Material[]): Promise<void> {
  const provider = activeProvider();
  if (!provider) return;
  const stale =
    !lastRefreshAt || Date.now() - lastRefreshAt.getTime() > CACHE_TTL_MS;
  if (!stale) return;
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const ids = current.map((m) => m.id).filter((id) => provider.supports(id));
      const quotes = await provider.fetchLatest(ids);
      await applyQuotes(quotes);
      lastRefreshAt = new Date();
      lastError = null;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Pricing refresh failed";
      lastRefreshAt = new Date(); // back off until the TTL passes
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Catalog materials with provenance. Refreshes provider prices when stale. */
export async function getMaterialsWithPricing(): Promise<MaterialWithProvenance[]> {
  const current = await loadFromDb();
  await refreshIfStale(current);
  const fresh = lastRefreshAt && !lastError ? await loadFromDb() : current;
  return fresh.filter((m) => isCatalogMaterial(m.id)).map(decorate);
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
