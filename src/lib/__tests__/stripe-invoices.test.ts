import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { marketplaceInvoicingStatus, summarizeInvoice } from "@/lib/stripe-invoices";

describe("Invoicing", () => {
  it("summarizes a hosted Stripe invoice for the billing UI", () => {
    const invoice = {
      id: "in_123",
      number: "SM-0001",
      status: "paid",
      amount_due: 9995,
      currency: "usd",
      created: 1_700_000_000,
      hosted_invoice_url: "https://invoice.stripe.com/i/test",
      invoice_pdf: "https://pay.stripe.com/invoice/test/pdf",
    } as unknown as Stripe.Invoice;
    expect(summarizeInvoice(invoice)).toEqual({
      id: "in_123",
      number: "SM-0001",
      status: "paid",
      amountDue: 9995,
      currency: "usd",
      created: 1_700_000_000,
      hostedInvoiceUrl: "https://invoice.stripe.com/i/test",
      invoicePdf: "https://pay.stripe.com/invoice/test/pdf",
    });
  });

  it("does not invoice supplier POs until Connect/Treasury exists", () => {
    const status = marketplaceInvoicingStatus();
    expect(status.available).toBe(false);
    expect(status.reason).toMatch(/Connect/i);
  });
});
