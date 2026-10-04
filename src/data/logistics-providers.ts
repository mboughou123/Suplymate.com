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
};

export const PROVIDERS_CHECKED_AT = "2026-10-04";

export const LOGISTICS_CATEGORY_ID = "logistics-insurance";
export const LOGISTICS_CATEGORY_LABEL = "Logistics & Insurance";

export const LOGISTICS_PROVIDERS = providers as LogisticsProvider[];

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

/** Initials for the text badge (no third-party logos are hotlinked). */
export function providerInitials(p: Pick<LogisticsProvider, "company">): string {
  const words = p.company
    .replace(/\(.*?\)/g, "")
    .split(/[\s+.&-]+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(inc|plc|ltd|se|a\/s|group|the|of|international)$/i.test(w));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
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
