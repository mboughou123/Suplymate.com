// "Logistics & Insurance" directory: cargo / marine transit insurers, cargo
// insurance brokers, and freight forwarders / customs brokers that arrange
// cargo insurance for shippers.
//
// Every field was copied from the provider's own website on `PROVIDERS_CHECKED_AT`
// (see `sourceUrls`); nothing is generated. Suplymate has no commercial
// relationship with any of them, so no listing may be labelled a partner.
// Phone and email are paid-plan data and live server-side in
// `logistics-provider-contacts.json`, never in this client-safe module.

import providers from "./logistics-providers.json";
import { getProviderLogo, resolveProviderLogo } from "./logistics-provider-logos";

export type LogisticsProviderKind =
  | "cargo-insurer"
  | "specialist-cargo-insurer"
  | "cargo-insurance-broker"
  | "freight-forwarder"
  | "customs-broker";

/** Where a listing's offer is sold, for matching providers to a shipment lane. */
export type ProviderMarket =
  | "global"
  | "north-america"
  | "latin-america"
  | "europe"
  | "middle-east-africa"
  | "asia-pacific";

export type LogisticsProvider = {
  id: string;
  /** Name of the cargo line / service, e.g. "Chubb Worldwide Ocean Cargo Insurance". */
  name: string;
  company: string;
  kind: LogisticsProviderKind;
  headquarters: { city: string; country: string } | null;
  description: string;
  coverage: string[];
  /** Regions exactly as the provider's site states them. */
  regions: string[];
  markets: ProviderMarket[];
  /** Official cargo product page (or homepage when there is none). */
  website: string;
  homepage: string;
  /** Official quote request / cargo contact page. */
  quoteUrl: string | null;
  sourceUrls: string[];
  /** Public path of a QA-approved logo. Absent when none was approved. */
  logo?: string;
  /** White logo; render it on a dark tile. */
  logoOnDark?: boolean;
};

export const PROVIDERS_CHECKED_AT = "2026-10-04";

export const LOGISTICS_CATEGORY_ID = "logistics-insurance";
export const LOGISTICS_CATEGORY_LABEL = "Logistics & Insurance";

function attachLogo(provider: LogisticsProvider): LogisticsProvider {
  const asset = getProviderLogo(provider.id);
  if (!asset) return provider;
  return {
    ...provider,
    logo: asset.src,
    ...(asset.logoOnDark ? { logoOnDark: true } : {}),
  };
}

export const LOGISTICS_PROVIDERS = (providers as LogisticsProvider[]).map(attachLogo);

const BY_ID = new Map(LOGISTICS_PROVIDERS.map((p) => [p.id, p]));

export function getLogisticsProvider(id: string | null | undefined): LogisticsProvider | undefined {
  return id ? BY_ID.get(id.trim().toLowerCase()) : undefined;
}

export type ProviderGroup = "insurance" | "logistics";

export function providerGroup(kind: LogisticsProviderKind): ProviderGroup {
  switch (kind) {
    case "cargo-insurer":
    case "specialist-cargo-insurer":
    case "cargo-insurance-broker":
      return "insurance";
    case "freight-forwarder":
    case "customs-broker":
      return "logistics";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function isInsuranceProvider(p: LogisticsProvider): boolean {
  return providerGroup(p.kind) === "insurance";
}

export function logisticsProviderHref(id: string): string {
  return `/logistics/${encodeURIComponent(id)}`;
}

export function logisticsDirectoryHref(group?: ProviderGroup): string {
  const base = `/suppliers?industry=${LOGISTICS_CATEGORY_ID}`;
  return group ? `${base}&type=${group}` : base;
}

/** Initials for the text badge when the provider has no logo. */
export function providerInitials(p: Pick<LogisticsProvider, "company">): string {
  const words = p.company
    .replace(/\(.*?\)/g, "")
    .split(/[\s+.&-]+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(inc|plc|ltd|se|a\/s|group|the|of|international)$/i.test(w));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** Whether a provider has a published or bundled logo to show instead of initials. */
export function providerHasLogo(
  p: Pick<LogisticsProvider, "id"> & Partial<Pick<LogisticsProvider, "logo" | "logoOnDark">>,
  logos?: Record<string, string> | null,
): boolean {
  return resolveProviderLogo(p, logos?.[p.id]) !== null;
}

/** Providers with a logo first, then the rest; original order kept within each group. */
export function sortProvidersLogoFirst<T extends Pick<LogisticsProvider, "id"> & Partial<Pick<LogisticsProvider, "logo">>>(
  providers: readonly T[],
  logos?: Record<string, string> | null,
): T[] {
  const withLogo: T[] = [];
  const without: T[] = [];
  for (const p of providers) (providerHasLogo(p, logos) ? withLogo : without).push(p);
  return [...withLogo, ...without];
}

export type ProviderCoverScene = "port" | "sea" | "air" | "warehouse" | "containers";

export type ProviderCover = { src: string; scene: ProviderCoverScene };

const COVER_SRC: Record<ProviderCoverScene, string> = {
  port: "/logistics/covers/cargo-port.webp",
  sea: "/logistics/covers/ship-at-sea.webp",
  air: "/logistics/covers/air-cargo.webp",
  warehouse: "/logistics/covers/warehouse-trucks.webp",
  containers: "/logistics/covers/customs-containers.webp",
};

function scenesForKind(kind: LogisticsProviderKind): readonly ProviderCoverScene[] {
  switch (kind) {
    case "cargo-insurer":
    case "specialist-cargo-insurer":
      return ["port", "sea", "air"];
    case "cargo-insurance-broker":
      return ["containers", "port"];
    case "customs-broker":
      return ["containers"];
    case "freight-forwarder":
      return ["warehouse", "air"];
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function stableIndex(id: string, size: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % size;
}

/**
 * Generic illustrative cover (not the provider's own premises), picked by kind
 * and stable per provider id. Used until a provider photo is published.
 */
export function providerCoverImage(provider: Pick<LogisticsProvider, "id" | "kind">): ProviderCover {
  const scenes = scenesForKind(provider.kind);
  const scene = scenes[stableIndex(provider.id, scenes.length)];
  return { src: COVER_SRC[scene], scene };
}

/** Insurers for the homepage band: insurance group only, logo-first, capped. */
export function featuredInsuranceProviders(logos?: Record<string, string> | null, limit = 6): LogisticsProvider[] {
  return sortProvidersLogoFirst(LOGISTICS_PROVIDERS.filter(isInsuranceProvider), logos).slice(0, limit);
}

export function providerMatches(p: LogisticsProvider, query: string): boolean {
  const needle = query.toLowerCase().trim();
  if (!needle) return true;
  return [p.name, p.company, p.description, p.headquarters?.country, p.headquarters?.city, ...p.coverage, ...p.regions]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}
