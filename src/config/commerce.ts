// Global commerce configuration for the Suplymate marketplace.
//
// Pricing rule: every product price shown to buyers includes a platform
// commission on top of the supplier's base price. Only the final displayed
// price is ever shown to users.
//
//   displayedPrice = supplierBasePrice * (1 + COMMISSION_RATE)
//
// Change COMMISSION_RATE here to update margins everywhere at once.

/** Platform commission applied to every product (0.10 = 10%). */
export const COMMISSION_RATE = 0.1;

/** Default currency for displayed prices. */
export const DEFAULT_CURRENCY = "USD";

/**
 * Apply the platform commission to a supplier base price.
 * @param basePrice supplier's base (wholesale) price
 * @param rate      commission rate (defaults to the global COMMISSION_RATE)
 */
export function applyCommission(
  basePrice: number,
  rate: number = COMMISSION_RATE
): number {
  return basePrice * (1 + rate);
}

/** Format a number as a price string (no decimals for large values). */
export function formatPrice(
  value: number,
  currency: string = DEFAULT_CURRENCY
): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  const fractionDigits = value < 100 ? 2 : 0;
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/** Convenience: base price -> formatted displayed (commissioned) price. */
export function displayPrice(
  basePrice: number,
  currency: string = DEFAULT_CURRENCY,
  rate: number = COMMISSION_RATE
): string {
  return formatPrice(applyCommission(basePrice, rate), currency);
}
