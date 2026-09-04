// Metals-API / Commodities-API compatible provider.
//
// Both services (metals-api.com, commodities-api.com) share the same
// `/api/latest?access_key=…&base=USD&symbols=…` schema where `rates[SYMBOL]`
// is the amount of SYMBOL one unit of `base` buys — so the USD price is
// 1 / rate. Base metals and commodities are quoted in their contract units
// (e.g. per metric ton for LME base metals). Symbol and unit mapping is
// declared once here so it can be corrected without touching callers.
//
// Env:
//   PRICING_API_PROVIDER = "metals-api" | "commodities-api"
//   PRICING_API_KEY      = access key
//   PRICING_API_BASE_URL = optional override

import type { PriceQuote, PricingProvider } from "@/lib/pricing/types";

type SymbolSpec = { symbol: string; unit: string; multiplier?: number };

// Catalog material id -> provider symbol + quoted unit.
const DEFAULT_SYMBOLS: Record<string, SymbolSpec> = {
  aluminum: { symbol: "ALU", unit: "USD/ton" },
  copper: { symbol: "XCU", unit: "USD/lb", multiplier: 1 / 2204.62 }, // provider quotes per ton
  nickel: { symbol: "NI", unit: "USD/ton" },
  zinc: { symbol: "ZNC", unit: "USD/ton" },
  "iron-ore": { symbol: "IRON", unit: "USD/ton" },
  steel: { symbol: "STEEL-HR", unit: "USD/ton" },
  lumber: { symbol: "LUMBER", unit: "USD/1000 bf" },
};

function providerId(): "metals-api" | "commodities-api" {
  return process.env.PRICING_API_PROVIDER === "commodities-api" ? "commodities-api" : "metals-api";
}

function baseUrl(): string {
  if (process.env.PRICING_API_BASE_URL) return process.env.PRICING_API_BASE_URL.replace(/\/$/, "");
  return providerId() === "commodities-api"
    ? "https://commodities-api.com/api"
    : "https://metals-api.com/api";
}

export function symbolMap(): Record<string, SymbolSpec> {
  // Optional JSON override, e.g. {"steel":{"symbol":"STEEL-RE","unit":"USD/ton"}}
  const raw = process.env.PRICING_SYMBOL_MAP;
  if (!raw) return DEFAULT_SYMBOLS;
  try {
    const parsed = JSON.parse(raw) as Record<string, SymbolSpec>;
    return { ...DEFAULT_SYMBOLS, ...parsed };
  } catch {
    return DEFAULT_SYMBOLS;
  }
}

export const metalsApiProvider: PricingProvider = {
  get id() {
    return providerId();
  },
  get name() {
    return providerId() === "commodities-api" ? "Commodities-API" : "Metals-API";
  },
  get attribution() {
    return `${this.name} (${this.id})`;
  },
  isConfigured() {
    return Boolean(process.env.PRICING_API_KEY && process.env.PRICING_API_KEY.trim());
  },
  supports(materialId: string) {
    return materialId in symbolMap();
  },
  async fetchLatest(materialIds: string[]): Promise<PriceQuote[]> {
    const key = process.env.PRICING_API_KEY;
    if (!key) return [];
    const map = symbolMap();
    const wanted = materialIds.filter((id) => id in map);
    if (wanted.length === 0) return [];

    const symbols = Array.from(new Set(wanted.map((id) => map[id].symbol))).join(",");
    const url = `${baseUrl()}/latest?access_key=${encodeURIComponent(key)}&base=USD&symbols=${encodeURIComponent(symbols)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`Pricing provider HTTP ${res.status}`);
      const data = (await res.json()) as {
        success?: boolean;
        error?: { info?: string; message?: string };
        timestamp?: number;
        rates?: Record<string, number>;
      };
      if (data.success === false) {
        throw new Error(data.error?.info || data.error?.message || "Pricing provider error");
      }
      const rates = data.rates ?? {};
      const at = data.timestamp ? new Date(data.timestamp * 1000) : new Date();

      const quotes: PriceQuote[] = [];
      for (const id of wanted) {
        const spec = map[id];
        const rate = rates[spec.symbol];
        if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;
        // rate = units of SYMBOL per 1 USD  ->  USD per unit = 1 / rate
        const usd = (1 / rate) * (spec.multiplier ?? 1);
        quotes.push({
          materialId: id,
          price: Number(usd.toFixed(usd < 10 ? 4 : 2)),
          currency: "USD",
          unit: spec.unit,
          source: providerId(),
          recordedAt: at,
        });
      }
      return quotes;
    } finally {
      clearTimeout(timer);
    }
  },
};
