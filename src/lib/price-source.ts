/**
 * Honesty labels for Lister `price_source_type`.
 *
 * A sourced unit_price is shown only with its provenance. Non-mill sources
 * (dealer lists, MRP, retail, marketplace) must never be captioned as
 * factory / mill FOB. Null unit_price stays RFQ regardless of type.
 */

export type PriceSourceType =
  | "dealer_list"
  | "printed_mrp"
  | "mill_estimate"
  | "mill_list"
  | "listed_fob"
  | "retail_eshop"
  | "marketplace_listing"
  | "listed_public"
  | "public_listing"
  | "rfq";

const LABELS: Record<PriceSourceType, string> = {
  dealer_list: "Dealer list",
  printed_mrp: "MRP",
  mill_estimate: "Mill estimate",
  mill_list: "Mill list",
  listed_fob: "Listed FOB",
  retail_eshop: "Retail",
  marketplace_listing: "Marketplace listing",
  listed_public: "Listed price",
  public_listing: "Listed price",
  rfq: "RFQ",
};

const CAPTIONS: Partial<Record<PriceSourceType, string>> = {
  dealer_list: "Dealer list (excl. GST) — not mill FOB",
  printed_mrp: "Printed MRP — not a dealer quote",
  mill_estimate: "Mill estimate — not a firm FOB offer",
  listed_fob: "Listed FOB — confirm with the mill",
  retail_eshop: "Retail / e-shop price — not mill FOB",
  marketplace_listing: "Marketplace listing — not mill FOB",
  listed_public: "Public listing — not mill FOB",
  public_listing: "Public listing — not mill FOB",
};

export function parsePriceSourceType(
  value: string | null | undefined
): PriceSourceType | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (key in LABELS) return key as PriceSourceType;
  return null;
}

/** Short badge on cards — only when a real unit price is shown. */
export function priceSourceBadgeLabel(
  type: string | null | undefined,
  hasPublicPrice: boolean
): string | null {
  if (!hasPublicPrice) return null;
  const parsed = parsePriceSourceType(type);
  if (!parsed || parsed === "rfq") return null;
  return LABELS[parsed];
}

/** One-line provenance under the price. */
export function priceSourceCaption(
  type: string | null | undefined,
  hasPublicPrice: boolean
): string | null {
  if (!hasPublicPrice) return null;
  const parsed = parsePriceSourceType(type);
  if (!parsed) return null;
  return CAPTIONS[parsed] ?? null;
}

export function isMillFobSource(type: string | null | undefined): boolean {
  const parsed = parsePriceSourceType(type);
  return parsed === "mill_list" || parsed === "listed_fob";
}
