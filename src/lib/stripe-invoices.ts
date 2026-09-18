import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export type InvoiceSummary = {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  currency: string;
  created: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

export function summarizeInvoice(invoice: Stripe.Invoice): InvoiceSummary {
  return {
    id: invoice.id,
    number: invoice.number ?? null,
    status: invoice.status ?? null,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
    created: invoice.created,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
  };
}

export async function listCustomerInvoices(
  customerId: string,
  limit = 12,
): Promise<InvoiceSummary[]> {
  const stripe = getStripe();
  if (!stripe) return [];
  const list = await stripe.invoices.list({ customer: customerId, limit });
  return list.data.map(summarizeInvoice);
}

export function formatInvoiceAmount(amountDue: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountDue / 100);
  } catch {
    return `${(amountDue / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/**
 * Accepted supplier quotes / purchase orders are off-platform today. Invoicing
 * those would require Connect (seller of record) plus Treasury for payouts.
 */
export function marketplaceInvoicingStatus(): { available: boolean; reason: string } {
  return {
    available: false,
    reason:
      "Supplier purchase orders stay off-platform until Stripe Connect destination charges and Treasury payouts are enabled.",
  };
}
