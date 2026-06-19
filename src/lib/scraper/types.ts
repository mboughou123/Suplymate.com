// Shared types for the public supplier-website scraper.

export type ScrapedImage = {
  url: string;
  /** Why we kept it: "product" | "logo" | "gallery" | "certification". */
  kind: "product" | "logo" | "gallery" | "certification";
  alt?: string | null;
  /** The public page the image was found on. */
  sourceUrl: string;
};

export type ScrapedCertification = {
  name: string;
  type: string | null;
  imageUrl: string | null;
  certificateUrl: string | null;
  sourceUrl: string;
};

export type ScrapedSupplierProduct = {
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  images: string[];
  productUrl: string | null;
  minimumOrderQuantity: string | null;
  shippingInfo: string | null;
  sourceUrl: string;
};

export type ScrapeWarning = { stage: string; message: string };

export type ScrapedSupplier = {
  /** Canonical site origin that was scraped. */
  sourceUrl: string;
  name: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** Company / factory gallery image URLs. */
  images: string[];
  certificationImages: string[];
  certifications: ScrapedCertification[];
  products: ScrapedSupplierProduct[];
  warnings: ScrapeWarning[];
  /** True when the scrape completed without being blocked by robots/safety. */
  ok: boolean;
  /** Set when the whole scrape was refused (robots/safety/network). */
  blockedReason?: string;
};

export const SCRAPER_USER_AGENT =
  "SuplymateBot/1.0 (+https://suplymate.com/bot; supplier directory indexer)";
