import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FileText, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "My RFQs | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-slate-100 text-slate-700" },
  submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-700" },
  quoted: { label: "Quoted", cls: "bg-amber-50 text-amber-700" },
  closed: { label: "Closed", cls: "bg-emerald-50 text-emerald-700" },
  expired: { label: "Expired", cls: "bg-slate-100 text-slate-500" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-500" },
};

export default async function RfqsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/rfqs");
  const { submitted } = await searchParams;

  const rfqs = await prisma.rfq.findMany({
    where: { buyerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true, quotes: { select: { id: true, status: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <FileText className="h-6 w-6 text-cyan" aria-hidden />
        My requests for quotation
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Track RFQs you&apos;ve sent and compare supplier quotes as they arrive.
      </p>

      {submitted && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your RFQ{rfqs.length === 1 ? "" : "s"} were submitted. Suppliers will respond with quotes.
        </div>
      )}

      {rfqs.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 py-16 text-center">
          <FileText className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="text-ink-muted">You haven&apos;t sent any RFQs yet.</p>
          <Link href="/products" className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan/90">
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rfqs.map((rfq) => {
            const s = STATUS_LABEL[rfq.status] ?? STATUS_LABEL.submitted;
            const quoteCount = rfq.quotes.length;
            return (
              <li key={rfq.id}>
                <Link
                  href={`/rfqs/${rfq.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-cyan/40 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-dim">{rfq.publicRef ?? rfq.id.slice(0, 8)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>{s.label}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-ink">
                      {rfq.supplierName ?? "Supplier"} · {rfq.productName}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-dim">
                      {rfq.items.length || 1} item{(rfq.items.length || 1) === 1 ? "" : "s"} ·{" "}
                      {quoteCount} quote{quoteCount === 1 ? "" : "s"} ·{" "}
                      {new Date(rfq.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink-dim" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
