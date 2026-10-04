/** Currency symbol shown before a price; index series have none. */
export function priceSymbol(m: { unit: string; currency: string }): string {
  if (m.unit.startsWith("Index")) return "";
  return m.currency === "USD" ? "$" : `${m.currency} `;
}
