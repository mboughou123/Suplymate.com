// Quote math. Totals are ALWAYS computed server-side from per-line
// (unitPrice * quantity). The browser never supplies totals or subtotals.
//
// Provenance is explicit: a null unitPrice means the supplier did not quote a
// price for that line — it is rendered as "Not quoted", never as 0 or invented.

export type QuoteLineInput = {
  productName: string;
  quantity: number;
  unit?: string | null;
  unitPrice?: number | null;
  note?: string | null;
  rfqItemId?: string | null;
};

export type ComputedQuoteLine = QuoteLineInput & {
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
};

export function computeLine(line: QuoteLineInput): ComputedQuoteLine {
  const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
  const hasPrice =
    line.unitPrice !== null &&
    line.unitPrice !== undefined &&
    Number.isFinite(Number(line.unitPrice)) &&
    Number(line.unitPrice) >= 0;
  const unitPrice = hasPrice ? Number(line.unitPrice) : null;
  const lineTotal = unitPrice === null ? null : Math.round(unitPrice * quantity * 100) / 100;
  return {
    ...line,
    quantity,
    unitPrice,
    lineTotal,
  };
}

// Subtotal = sum of priced lines. Returns null when NO line was priced (so the
// UI shows "Not quoted" rather than $0.00).
export function computeSubtotal(lines: ComputedQuoteLine[]): number | null {
  const priced = lines.filter((l) => l.lineTotal !== null);
  if (priced.length === 0) return null;
  const sum = priced.reduce((acc, l) => acc + (l.lineTotal ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

export function formatMoney(amount: number | null | undefined, currency = "USD"): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "Not quoted";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
