import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import QuoteComparison from "@/components/rfq/QuoteComparison";

export const metadata: Metadata = {
  title: "RFQ details | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const rfq = await prisma.rfq.findUnique({
    where: { id },
    include: {
      items: true,
      quotes: { include: { items: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!rfq || rfq.buyerId !== session.user.id) notFound();

  const serialized = {
    id: rfq.id,
    publicRef: rfq.publicRef,
    status: rfq.status,
    supplierId: rfq.supplierId,
    supplierName: rfq.supplierName,
    destination: rfq.destination,
    deadline: rfq.deadline,
    details: rfq.details,
    createdAt: rfq.createdAt.toISOString(),
    items: rfq.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unit: i.unit,
      snapshotPrice: i.snapshotPrice,
      snapshotCurrency: i.snapshotCurrency,
    })),
    quotes: rfq.quotes
      .filter((q) => q.status !== "draft")
      .map((q) => ({
        id: q.id,
        publicRef: q.publicRef,
        status: q.status,
        currency: q.currency,
        subtotal: q.subtotal,
        leadTimeDays: q.leadTimeDays,
        incoterms: q.incoterms,
        paymentTerms: q.paymentTerms,
        shippingCostLabel: q.shippingCostLabel,
        validUntil: q.validUntil ? q.validUntil.toISOString() : null,
        notes: q.notes,
        items: q.items.map((it) => ({
          id: it.id,
          rfqItemId: it.rfqItemId,
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
          note: it.note,
        })),
      })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/rfqs" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-cyan">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to my RFQs
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">
          {rfq.publicRef ?? "RFQ"}
        </h1>
        <span className="font-mono text-xs text-ink-dim">to {rfq.supplierName ?? "supplier"}</span>
      </div>

      <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-dim">Destination</p>
          <p className="text-sm text-ink">{rfq.destination || "Not specified"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-dim">Needed by</p>
          <p className="text-sm text-ink">{rfq.deadline || "Not specified"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-dim">Submitted</p>
          <p className="text-sm text-ink">{new Date(rfq.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <QuoteComparison rfq={serialized} />
    </div>
  );
}
