import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the Prisma material tables. Each test may flip
// `dbAvailable` to simulate an unreachable database.
type MaterialRow = {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  unit: string;
  currency: string;
  dailyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  signal: string;
  history: string;
  category: string | null;
  source: string | null;
  lastUpdatedAt: Date | null;
};
type PointRow = { materialId: string; price: number; currency: string; unit: string; source: string; recordedAt: Date };

const db = {
  available: true,
  materials: [] as MaterialRow[],
  points: [] as PointRow[],
};

function guard() {
  if (!db.available) throw new Error("ECONNREFUSED: database unavailable");
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    material: {
      findMany: async () => {
        guard();
        return [...db.materials].sort((a, b) => a.name.localeCompare(b.name));
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        guard();
        return db.materials.find((m) => m.id === where.id) ?? null;
      },
      create: async ({ data }: { data: Omit<MaterialRow, "lastUpdatedAt"> }) => {
        guard();
        const row: MaterialRow = { ...data, lastUpdatedAt: null };
        db.materials.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<MaterialRow> }) => {
        guard();
        const row = db.materials.find((m) => m.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    materialPricePoint: {
      deleteMany: async ({ where }: { where: { materialId: string; source: string } }) => {
        guard();
        const before = db.points.length;
        db.points = db.points.filter((p) => !(p.materialId === where.materialId && p.source === where.source));
        return { count: before - db.points.length };
      },
      createMany: async ({ data }: { data: PointRow[] }) => {
        guard();
        db.points.push(...data);
        return { count: data.length };
      },
      create: async ({ data }: { data: PointRow }) => {
        guard();
        db.points.push(data);
        return data;
      },
      findFirst: async ({ where }: { where: { materialId: string; source: string } }) => {
        guard();
        const rows = db.points
          .filter((p) => p.materialId === where.materialId && p.source === where.source)
          .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
        return rows[0] ?? null;
      },
      findMany: async () => {
        guard();
        return [];
      },
      groupBy: async ({ where }: { where: { materialId: { in: string[] } } }) => {
        guard();
        const groups = new Map<string, { materialId: string; source: string; _max: { recordedAt: Date | null } }>();
        for (const p of db.points) {
          if (!where.materialId.in.includes(p.materialId)) continue;
          const key = `${p.materialId}|${p.source}`;
          const g = groups.get(key) ?? { materialId: p.materialId, source: p.source, _max: { recordedAt: null } };
          if (!g._max.recordedAt || p.recordedAt > g._max.recordedAt) g._max.recordedAt = p.recordedAt;
          groups.set(key, g);
        }
        return [...groups.values()];
      },
    },
  },
}));

import { materials as seedMaterials } from "@/data/materials";
import { WPI_PROVIDER_ID, worldPriceIndexProvider, wpiRequestsPerRefresh } from "@/lib/pricing/providers/worldPriceIndex";
import type { PriceQuote } from "@/lib/pricing/types";

// The service keeps `lastRefreshAt` / `lastError` in module scope; import a
// fresh copy per test so refresh scenarios don't leak into each other.
async function loadService() {
  vi.resetModules();
  return import("@/lib/pricing/pricingService");
}

function seedRow(id: string): MaterialRow {
  const m = seedMaterials.find((x) => x.id === id)!;
  return {
    id: m.id,
    name: m.name,
    symbol: m.symbol,
    currentPrice: m.currentPrice,
    unit: m.unit,
    currency: m.currency,
    dailyChange: m.dailyChange,
    monthlyChange: m.monthlyChange,
    yearlyChange: m.yearlyChange,
    signal: m.signal,
    history: JSON.stringify(m.history),
    category: m.category ?? null,
    source: "seed",
    lastUpdatedAt: null,
  };
}

/** i-th month (0-based) counting from January 2025. */
const month = (i: number) => new Date(Date.UTC(2025, i, 1));

function wpiQuote(prices: number[], fetchedAt = new Date("2026-09-05T06:00:00Z")): PriceQuote {
  const history = prices.map((price, i) => ({ price, recordedAt: month(i) }));
  return {
    materialId: "aluminum",
    price: prices[prices.length - 1],
    currency: "USD",
    unit: "USD/ton",
    source: WPI_PROVIDER_ID,
    recordedAt: history[history.length - 1].recordedAt,
    fetchedAt,
    cadence: "monthly",
    history,
  };
}

describe("pricing service", () => {
  beforeEach(() => {
    db.available = true;
    db.materials = [seedRow("aluminum"), seedRow("steel")];
    db.points = [];
    vi.unstubAllEnvs();
    vi.stubEnv("WPI_API_KEY", "");
    vi.stubEnv("PRICING_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("labels World Price Index data with the monthly IMF attribution", async () => {
    const { sourceLabelFor } = await loadService();
    expect(sourceLabelFor(WPI_PROVIDER_ID)).toBe("Live from World Price Index · IMF Primary Commodity Prices (monthly)");
    expect(sourceLabelFor("seed")).toMatch(/not live/);
  });

  it("prefers World Price Index when several providers are configured", async () => {
    const { pricingStatus } = await loadService();
    vi.stubEnv("WPI_API_KEY", "k");
    vi.stubEnv("PRICING_API_KEY", "k2");
    const status = pricingStatus();
    expect(status.provider).toBe(WPI_PROVIDER_ID);
    expect(status.cadence).toBe("monthly");
    expect(status.refreshIntervalMinutes).toBe(24 * 60);
    expect(status.supported).toContain("copper");
    expect(status.supported).not.toContain("steel");
  });

  it("falls back to seed data when the database is unreachable", async () => {
    const { getMaterialsWithPricing } = await loadService();
    db.available = false;
    const all = await getMaterialsWithPricing();
    expect(all.length).toBe(seedMaterials.length);
    expect(all.every((m) => m.source === "seed" && !m.isLive && m.cadence === "daily")).toBe(true);
  });

  it("backfills history + price points on the first switch to a provider", async () => {
    const { applyQuotes } = await loadService();
    const prices = [2400, 2450, 2500, 2480, 2520, 2550, 2600, 2580, 2620, 2650, 2700, 2680, 2750];
    await applyQuotes([wpiQuote(prices)]);

    const row = db.materials.find((m) => m.id === "aluminum")!;
    expect(row.source).toBe(WPI_PROVIDER_ID);
    expect(row.currentPrice).toBe(2750);
    expect(JSON.parse(row.history)).toEqual(prices);
    expect(row.lastUpdatedAt?.toISOString()).toBe("2026-09-05T06:00:00.000Z");
    // Monthly cadence: no daily figure, month-over-month and 12-months-back.
    expect(row.dailyChange).toBe(0);
    expect(row.monthlyChange).toBeCloseTo(((2750 - 2680) / 2680) * 100, 1);
    expect(row.yearlyChange).toBeCloseTo(((2750 - 2400) / 2400) * 100, 1);

    const points = db.points.filter((p) => p.materialId === "aluminum");
    expect(points).toHaveLength(prices.length);
    expect(points[0].recordedAt.toISOString().slice(0, 7)).toBe("2025-01");
    expect(points.every((p) => p.source === WPI_PROVIDER_ID)).toBe(true);
  });

  it("does not duplicate points when the same monthly observation is re-fetched", async () => {
    const { applyQuotes } = await loadService();
    const prices = [2400, 2450, 2500];
    await applyQuotes([wpiQuote(prices)]);
    await applyQuotes([wpiQuote(prices, new Date("2026-09-06T06:00:00Z"))]);

    expect(db.points.filter((p) => p.materialId === "aluminum")).toHaveLength(3);
    const row = db.materials.find((m) => m.id === "aluminum")!;
    expect(JSON.parse(row.history)).toEqual(prices);
    expect(row.lastUpdatedAt?.toISOString()).toBe("2026-09-06T06:00:00.000Z");
  });

  it("appends only the newest observation once a new month is published", async () => {
    const { applyQuotes } = await loadService();
    await applyQuotes([wpiQuote([2400, 2450, 2500])]);
    const next = wpiQuote([2400, 2450, 2500, 2600]);
    await applyQuotes([next]);

    expect(db.points.filter((p) => p.materialId === "aluminum")).toHaveLength(4);
    const row = db.materials.find((m) => m.id === "aluminum")!;
    expect(JSON.parse(row.history)).toEqual([2400, 2450, 2500, 2600]);
    expect(row.monthlyChange).toBeCloseTo(4, 1);
  });

  it("skips the provider refresh when the DB already holds a recent update (cold start)", async () => {
    const { getMaterialsWithPricing } = await loadService();
    vi.stubEnv("WPI_API_KEY", "k");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const row = db.materials.find((m) => m.id === "aluminum")!;
    row.source = WPI_PROVIDER_ID;
    row.lastUpdatedAt = new Date(); // refreshed moments ago by another instance
    db.points.push(
      { materialId: "aluminum", price: 2500, currency: "USD", unit: "USD/ton", source: WPI_PROVIDER_ID, recordedAt: month(5) },
      { materialId: "aluminum", price: 2600, currency: "USD", unit: "USD/ton", source: WPI_PROVIDER_ID, recordedAt: month(6) },
      // Stale points from a previous provider must not count.
      { materialId: "aluminum", price: 1, currency: "USD", unit: "USD/ton", source: "metals-api", recordedAt: new Date() },
    );

    const all = await getMaterialsWithPricing();
    expect(fetchSpy).not.toHaveBeenCalled();
    const aluminum = all.find((m) => m.id === "aluminum")!;
    expect(aluminum.isLive).toBe(true);
    expect(aluminum.cadence).toBe("monthly");
    // Newest observation of the current provider, not the fetch time.
    expect(aluminum.observedAt).toBe(month(6).toISOString());
    expect(all.find((m) => m.id === "steel")?.observedAt).toBeNull();
    vi.unstubAllGlobals();
  });

  it("keeps serving cached data when the provider fails", async () => {
    const { getMaterialsWithPricing, pricingStatus } = await loadService();
    vi.stubEnv("WPI_API_KEY", "k");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const all = await getMaterialsWithPricing();
    expect(all.find((m) => m.id === "aluminum")?.source).toBe("seed");
    expect(pricingStatus().lastError).toMatch(/rejected the API key/);
    warn.mockRestore();
    vi.unstubAllGlobals();
  });

  it("adds catalog materials that are missing from the DB, with their dated reference series", async () => {
    const { getMaterialsWithPricing } = await loadService();
    const all = await getMaterialsWithPricing();
    expect(all.map((m) => m.id).sort()).toEqual(seedMaterials.map((m) => m.id).sort());
    const tin = all.find((m) => m.id === "tin")!;
    expect(tin.isLive).toBe(false);
    expect(tin.sourceLabel).toMatch(/not live/);
    expect(tin.observedAt).toBe("2026-08-31");
    expect(all.find((m) => m.id === "steel")?.observedAt).toBeNull();
  });

  it("creates the DB row of a newly added material when its first quote arrives", async () => {
    const { applyQuotes } = await loadService();
    expect(db.materials.some((m) => m.id === "tin")).toBe(false);
    await applyQuotes([{ ...wpiQuote([52882, 55385]), materialId: "tin" }]);
    const tin = db.materials.find((m) => m.id === "tin")!;
    expect(tin.source).toBe(WPI_PROVIDER_ID);
    expect(tin.currentPrice).toBe(55385);
    expect(db.points.filter((p) => p.materialId === "tin")).toHaveLength(2);
  });

  it("rotates refresh batches so every mapped series is covered within a few days", async () => {
    const { pickRefreshBatch } = await loadService();
    vi.stubEnv("WPI_API_KEY", "k");
    const supported = seedMaterials.filter((m) => worldPriceIndexProvider.supports(m.id)).map((m) => m.id);
    const budget = wpiRequestsPerRefresh();
    const days = Math.ceil(supported.length / budget);
    const seen = new Set<string>();
    for (let d = 0; d < days; d++) {
      const batch = pickRefreshBatch(worldPriceIndexProvider, seedMaterials, Date.UTC(2026, 9, 1 + d, 12));
      expect(batch.length).toBe(budget);
      batch.forEach((id) => seen.add(id));
    }
    expect([...seen].sort()).toEqual([...supported].sort());
  });

  it("stays within 250 World Price Index requests over a 31-day month, cold starts included", async () => {
    vi.stubEnv("WPI_API_KEY", "k");
    vi.useFakeTimers({ toFake: ["Date"] });
    const requested = new Map<string, number>();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const slug = String(input).match(/commodity-series\/([^?]+)/)![1];
        requested.set(slug, (requested.get(slug) ?? 0) + 1);
        const body = { data: [{ observed_at: "2026-08-31", value: 120 }, { observed_at: "2026-07-31", value: 100 }] };
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    try {
      for (let day = 0; day < 31; day++) {
        // Each day: a cold start in the morning, then warm visits.
        vi.setSystemTime(new Date(Date.UTC(2026, 9, 1 + day, 7)));
        const { getMaterialsWithPricing } = await loadService();
        await getMaterialsWithPricing();
        for (const hour of [12, 18, 23]) {
          vi.setSystemTime(new Date(Date.UTC(2026, 9, 1 + day, hour)));
          await getMaterialsWithPricing();
        }
      }
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
    const total = [...requested.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(250);
    const mapped = seedMaterials.filter((m) => worldPriceIndexProvider.supports(m.id));
    expect(requested.size).toBe(mapped.length);
    expect(mapped.every((m) => db.materials.find((r) => r.id === m.id)?.source === WPI_PROVIDER_ID)).toBe(true);
  });

  it("computes daily-cadence changes from the previous price and ~22 points back", async () => {
    const { changesFromHistory } = await loadService();
    const history = Array.from({ length: 30 }, (_, i) => 100 + i);
    const c = changesFromHistory(history, "daily", 128, { yearlyChange: 5 });
    expect(c.dailyChange).toBeCloseTo(((129 - 128) / 128) * 100, 2);
    expect(c.monthlyChange).toBeCloseTo(((129 - 108) / 108) * 100, 2);
    expect(c.yearlyChange).toBe(5);
  });
});
