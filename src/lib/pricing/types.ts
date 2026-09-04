export type PriceQuote = {
  materialId: string;
  price: number;
  currency: string;
  unit: string;
  /** Provider id, e.g. "metals-api". */
  source: string;
  recordedAt: Date;
};

export interface PricingProvider {
  readonly id: string;
  readonly name: string;
  /** Human-readable attribution shown next to prices from this provider. */
  readonly attribution: string;
  isConfigured(): boolean;
  supports(materialId: string): boolean;
  /** Fetch the latest quotes for the requested catalog materials. */
  fetchLatest(materialIds: string[]): Promise<PriceQuote[]>;
}

export type PricingStatus = {
  provider: string | null;
  providerName: string | null;
  configured: boolean;
  /** Materials the configured provider can quote. */
  supported: string[];
  lastRefreshAt: string | null;
  lastError: string | null;
};
