import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/quotes";

export const metadata: Metadata = {
  title: "Purchase orders | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/purchase-orders");

  const accepted = await prisma.supplierQuote.findMany({
    where: {
      status: "accepted",
      rfq: { buyerId: session.user.id },
    },
    include: {
      rfq: { select: { publicRef: true, productName: true, supplierName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Purchase orders</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Accepted supplier quotes ready for your internal procurement process. Formal PO documents,
        e-signatures, and team approval workflows are partially supported — coordinate final terms
        with suppliers via{" "}
        <Link href="/messages" className="text-cyan hover:underline">
          messages
        </Link>
        .
      </p>

      {accepted.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-ink-muted">No accepted quotes yet.</p>
          <Link href="/rfqs" className="mt-3 inline-block text-sm font-semibold text-cyan hover:underline">
            View your RFQs
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {accepted.map((q) => (
            <li key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">
                    {q.publicRef ?? "Quote"} · {q.rfq.supplierName}
                  </p>
                  <p className="text-xs text-ink-dim">
                    RFQ {q.rfq.publicRef ?? "—"} · {q.rfq.productName}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Accepted
                </span>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-dim">Subtotal</dt>
                  <dd className="font-medium text-ink">
                    {q.subtotal != null ? formatMoney(q.subtotal, q.currency) : "Not quoted"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-dim">Lead time</dt>
                  <dd className="font-medium text-ink">
                    {q.leadTimeDays != null ? `${q.leadTimeDays} days` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-dim">Incoterms</dt>
                  <dd className="font-medium text-ink">{q.incoterms ?? "—"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/rfqs/${q.rfqId}`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink hover:border-cyan/40"
                >
                  View RFQ
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
