// World Price Index provider (https://worldpriceindex.org).
//
// Serves IMF Primary Commodity Prices (monthly, USD) through a normalised
// REST API:  GET /v1/commodity-series/{series_slug}?limit=N  with
// `Authorization: Bearer <WPI_API_KEY>`. Observations come newest-first.
//
// The data is MONTHLY, so refreshing more than once a day is pointless and
// would burn the request quota (free tier: 250 requests / month). Each series
// costs one request; the same response also supplies the history used to
// backfill charts. There are more series than the quota allows fetching every
// day, so each refresh fetches at most `wpiRequestsPerRefresh()` of them —
// the pricing service picks the stalest — and the full set rotates over a few
// days, which is plenty for monthly observations.
//
// Env:
//   WPI_API_KEY                bearer key (server-side only)
//   WPI_API_BASE_URL           optional override (default https://api.worldpriceindex.org)
//   WPI_REFRESH_HOURS          optional refresh interval (default 24)
//   WPI_MONTHLY_REQUEST_CAP    optional plan quota (default 250)

import type { PriceQuote, PricingProvider } from "@/lib/pricing/types";

export const WPI_PROVIDER_ID = "world-price-index";

type SeriesSpec = {
  /** WPI series slug (USD, monthly). */
  series: string;
  /** Unit shown in Suplymate after `multiplier` is applied. */
  unit: string;
  /** Converts the WPI value (see comment) into `unit`. */
  multiplier?: number;
};

const METRIC_TON_TO_LB = 1 / 2204.62;
/** 1,000 board feet of sawn softwood ≈ 2.36 m³. */
const CUBIC_METER_TO_1000BF = 2.36;
/** IMF quotes rubber in US cents per pound. */
const US_CENTS_PER_LB_TO_USD_PER_KG = 2.20462 / 100;

// Catalog material id -> IMF PCPS series on World Price Index. Units are the
// IMF series units unless a multiplier converts them.
const SERIES: Record<string, SeriesSpec> = {
  aluminum: { series: "aluminum-palum-usd-monthly", unit: "USD/ton" },
  copper: { series: "copper-pcopp-usd-monthly", unit: "USD/lb", multiplier: METRIC_TON_TO_LB },
  zinc: { series: "zinc-pzinc-usd-monthly", unit: "USD/ton" },
  nickel: { series: "nickel-pnick-usd-monthly", unit: "USD/ton" },
  "iron-ore": { series: "iron-ore-piorecr-usd-monthly", unit: "USD/ton" },
  lumber: { series: "soft-sawnwood-psawore-usd-monthly", unit: "USD/1000 bf", multiplier: CUBIC_METER_TO_1000BF },
  tin: { series: "tin-ptin-usd-monthly", unit: "USD/ton" },
  lead: { series: "lead-plead-usd-monthly", unit: "USD/ton" },
  chromium: { series: "chromium-pchrom-usd-monthly", unit: "USD/ton" },
  molybdenum: { series: "molybdenum-plmmody-usd-monthly", unit: "USD/ton" },
  cobalt: { series: "cobalt-pcoba-usd-monthly", unit: "USD/ton" },
  silver: { series: "silver-psilver-usd-monthly", unit: "USD/oz" },
  platinum: { series: "platinum-pplat-usd-monthly", unit: "USD/oz" },
  silicon: { series: "silicon-psillump-usd-monthly", unit: "USD/ton" },
  rubber: { series: "rubber-prubb-usd-monthly", unit: "USD/kg", multiplier: US_CENTS_PER_LB_TO_USD_PER_KG },
  hardwood: { series: "hard-sawnwood-dark-red-meranti-psawmal-usd-monthly", unit: "USD/m³" },
  coal: { series: "coal-australia-pcoalau-usd-monthly", unit: "USD/ton" },
  "energy-transition-metals": { series: "energy-transition-metal-pentm-index-monthly", unit: "Index pts" },
  "base-metals-index": { series: "metal-pmeta-index-monthly", unit: "Index pts" },
};


/** Number of monthly observations pulled per refresh (also the chart backfill). */
const HISTORY_POINTS = 24;
const REQUEST_TIMEOUT_MS = 10_000;

type WpiObservation = { observed_at: string; value: number | null };

function apiKey(): string | null {
  const key = process.env.WPI_API_KEY?.trim();
  return key ? key : null;
}

function baseUrl(): string {
  return (process.env.WPI_API_BASE_URL?.trim() || "https://api.worldpriceindex.org").replace(/\/$/, "");
}

export function wpiRefreshIntervalMs(): number {
  const hours = Number(process.env.WPI_REFRESH_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3_600_000;
}

/** Keeps ~10% of the monthly quota free for retries after a failed refresh. */
const QUOTA_HEADROOM = 0.9;

/**
 * Series fetched per refresh so that a 31-day month of refreshes stays under
 * the monthly request cap: 250 requests at one refresh a day → 7 per refresh.
 */
export function wpiRequestsPerRefresh(): number {
  const cap = Number(process.env.WPI_MONTHLY_REQUEST_CAP);
  const monthlyCap = Number.isFinite(cap) && cap > 0 ? cap : 250;
  const refreshesPerMonth = Math.ceil((31 * 24 * 3_600_000) / wpiRefreshIntervalMs());
  return Math.max(1, Math.floor((monthlyCap * QUOTA_HEADROOM) / refreshesPerMonth));
}

async function fetchSeries(slug: string, key: string): Promise<WpiObservation[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl()}/v1/commodity-series/${encodeURIComponent(slug)}?limit=${HISTORY_POINTS}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) throw new Error("World Price Index rejected the API key");
    if (res.status === 429) throw new Error("World Price Index rate limit reached");
    if (!res.ok) throw new Error(`World Price Index HTTP ${res.status}`);
    const body = (await res.json()) as { data?: WpiObservation[] };
    return Array.isArray(body.data) ? body.data : [];
  } finally {
    clearTimeout(timer);
  }
}

function round(value: number): number {
  return Number(value.toFixed(value < 10 ? 4 : 2));
}

export const worldPriceIndexProvider: PricingProvider = {
  id: WPI_PROVIDER_ID,
  name: "World Price Index",
  attribution: "World Price Index · IMF Primary Commodity Prices (monthly)",
  cadence: "monthly",
  get refreshIntervalMs() {
    return wpiRefreshIntervalMs();
  },
  get maxRequestsPerRefresh() {
    return wpiRequestsPerRefresh();
  },
  isConfigured() {
    return apiKey() !== null;
  },
  supports(materialId: string) {
    return materialId in SERIES;
  },
  async fetchLatest(materialIds: string[]): Promise<PriceQuote[]> {
    const key = apiKey();
    if (!key) return [];
    const wanted = materialIds.filter((id) => id in SERIES).slice(0, wpiRequestsPerRefresh());
    if (wanted.length === 0) return [];

    const fetchedAt = new Date();
    const results = await Promise.allSettled(
      wanted.map(async (id): Promise<PriceQuote | null> => {
        const spec = SERIES[id];
        const rows = await fetchSeries(spec.series, key);
        const points = rows
          .filter((r) => typeof r.value === "number" && Number.isFinite(r.value) && r.value! > 0)
          .map((r) => ({
            price: round(r.value! * (spec.multiplier ?? 1)),
            recordedAt: new Date(r.observed_at),
          }))
          .filter((p) => !Number.isNaN(p.recordedAt.getTime()))
          .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
        const latest = points[points.length - 1];
        if (!latest) return null;
        return {
          materialId: id,
          price: latest.price,
          currency: "USD",
          unit: spec.unit,
          source: WPI_PROVIDER_ID,
          recordedAt: latest.recordedAt,
          fetchedAt,
          cadence: "monthly",
          history: points,
        };
      }),
    );

    const quotes: PriceQuote[] = [];
    const failures: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) quotes.push(r.value);
      else if (r.status === "rejected") failures.push(`${wanted[i]}: ${r.reason instanceof Error ? r.reason.message : "failed"}`);
    });

    // Surface auth/quota problems (every request failed) instead of silently
    // returning nothing — the pricing service records the message as lastError.
    if (quotes.length === 0 && failures.length) throw new Error(failures[0]);
    if (failures.length) console.warn(`[pricing:wpi] partial refresh — ${failures.join("; ")}`);
    return quotes;
  },
};
