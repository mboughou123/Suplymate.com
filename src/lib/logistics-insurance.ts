// Picks which cargo insurers the "Insure this shipment" card lists. Pure and
// deterministic: the same lane and seed always produce the same short list, and
// equally relevant providers rotate by seed so no insurer is favoured (Suplymate
// takes no commissions and ranks nobody for money).

import {
  LOGISTICS_PROVIDERS,
  isInsuranceProvider,
  type LogisticsProvider,
  type ProviderMarket,
} from "@/data/logistics-providers";

type RegionalMarket = Exclude<ProviderMarket, "global">;

const MARKET_KEYWORDS: Record<RegionalMarket, string[]> = {
  "north-america": ["united states", "usa", "u.s.", "canada", "mexico", "houston", "new york", "chicago", "los angeles", "toronto"],
  "latin-america": ["brazil", "brasil", "argentina", "chile", "colombia", "peru", "uruguay", "ecuador", "panama", "costa rica", "latin america", "south america"],
  europe: [
    "united kingdom", "uk", "england", "scotland", "ireland", "germany", "france", "italy", "spain", "portugal",
    "netherlands", "belgium", "luxembourg", "switzerland", "austria", "poland", "czech", "slovakia", "hungary",
    "romania", "bulgaria", "greece", "denmark", "sweden", "norway", "finland", "estonia", "latvia", "lithuania",
    "slovenia", "croatia", "serbia", "ukraine", "europe", "eu", "rotterdam", "hamburg", "antwerp",
  ],
  "middle-east-africa": [
    "turkey", "türkiye", "uae", "united arab emirates", "dubai", "saudi arabia", "qatar", "oman", "kuwait", "bahrain",
    "israel", "jordan", "egypt", "morocco", "algeria", "tunisia", "nigeria", "kenya", "ghana", "south africa",
    "ethiopia", "mena", "middle east", "africa",
  ],
  "asia-pacific": [
    "china", "hong kong", "taiwan", "japan", "korea", "india", "pakistan", "bangladesh", "sri lanka", "vietnam",
    "viet nam", "thailand", "malaysia", "singapore", "indonesia", "philippines", "australia", "new zealand",
    "shanghai", "shenzhen", "asia",
  ],
};

const keywordRegex = new Map<RegionalMarket, RegExp>(
  (Object.entries(MARKET_KEYWORDS) as [RegionalMarket, string[]][]).map(([market, words]) => [
    market,
    new RegExp(`(^|[^a-z])(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})($|[^a-z])`, "i"),
  ]),
);

/** Regional markets named in free text such as a country or "Rotterdam, Netherlands". */
export function marketsInText(text: string | null | undefined): RegionalMarket[] {
  if (!text?.trim()) return [];
  return [...keywordRegex].filter(([, re]) => re.test(text)).map(([market]) => market);
}

export type ShipmentLane = {
  /** Supplier country / location (where goods ship from). */
  origin?: string | null;
  /** Buyer destination as typed on the RFQ. */
  destination?: string | null;
  /** Stable per-context value (supplier id, RFQ id) that rotates equal-scored providers. */
  seed?: string;
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Higher = better fit for the lane. Regional insurers outrank global ones only on their own lanes. */
export function laneScore(provider: LogisticsProvider, lane: ShipmentLane): number {
  const laneMarkets = new Set([...marketsInText(lane.origin), ...marketsInText(lane.destination)]);
  if (provider.markets.includes("global")) return 2;
  const hits = provider.markets.filter((m) => m !== "global" && laneMarkets.has(m)).length;
  return hits > 0 ? 2 + hits : 0;
}

export function pickShipmentInsurers(
  lane: ShipmentLane,
  count = 3,
  pool: LogisticsProvider[] = LOGISTICS_PROVIDERS,
): LogisticsProvider[] {
  const seed = `${lane.seed ?? ""}|${lane.origin ?? ""}|${lane.destination ?? ""}`;
  const ranked = pool
    .filter(isInsuranceProvider)
    .map((provider) => ({ provider, score: laneScore(provider, lane), tie: hash(`${seed}|${provider.id}`) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.tie - b.tie)
    .map((x) => x.provider);
  const picked = ranked.slice(0, Math.max(0, count));
  // Keep one worldwide insurer in a full list so cross-border lanes are not
  // left with only single-region cover.
  const isGlobal = (p: LogisticsProvider) => p.markets.includes("global");
  if (count >= 3 && picked.length === count && !picked.some(isGlobal)) {
    const global = ranked.find(isGlobal);
    if (global) picked[picked.length - 1] = global;
  }
  return picked;
}
