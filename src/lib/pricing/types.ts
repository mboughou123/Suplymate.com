/** How often a provider publishes new observations. */
export type PriceCadence = "daily" | "monthly";

export type PriceQuote = {
  materialId: string;
  price: number;
  currency: string;
  unit: string;
  /** Provider id, e.g. "metals-api". */
  source: string;
  /** When the provider observed this price (publication / trading date). */
  recordedAt: Date;
  /** When Suplymate fetched it. Defaults to `recordedAt`. */
  fetchedAt?: Date;
  /** Publication cadence of the underlying series. Defaults to "daily". */
  cadence?: PriceCadence;
  /**
   * Optional back-history (oldest first) delivered with the quote. Used to
   * backfill charts the first time a material switches to this provider.
   */
  history?: { price: number; recordedAt: Date }[];
};

export interface PricingProvider {
  readonly id: string;
  readonly name: string;
  /** Human-readable attribution shown next to prices from this provider. */
  readonly attribution: string;
  /** Publication cadence of the provider's series. Defaults to "daily". */
  readonly cadence?: PriceCadence;
  /**
   * Minimum time between refreshes for this provider. Overrides the global
   * PRICING_CACHE_TTL_MINUTES — e.g. monthly data should refresh daily at most.
   */
  readonly refreshIntervalMs?: number;
  isConfigured(): boolean;
  supports(materialId: string): boolean;
  /** Fetch the latest quotes for the requested catalog materials. */
  fetchLatest(materialIds: string[]): Promise<PriceQuote[]>;
}

export type PricingStatus = {
  provider: string | null;
  providerName: string | null;
  /** Full attribution line, e.g. "World Price Index · IMF Primary Commodity Prices (monthly)". */
  attribution: string | null;
  cadence: PriceCadence | null;
  configured: boolean;
  /** Materials the configured provider can quote. */
  supported: string[];
  /** Effective refresh interval for the active provider, in minutes. */
  refreshIntervalMinutes: number | null;
  lastRefreshAt: string | null;
  lastError: string | null;
};
