import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "RFQs & quotes · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminRfqsPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/rfqs");
  if (!ok) redirect("/");

  const rfqs = await prisma.rfq
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        items: { select: { id: true } },
        quotes: { select: { id: true, status: true } },
        buyer: { select: { name: true, email: true } },
      },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-ink-muted hover:text-cyan">← Admin</Link>
      <h1 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <FileText className="h-6 w-6 text-cyan" aria-hidden />
        RFQs &amp; quotes
      </h1>
      <p className="mt-1 text-sm text-ink-muted">Oversight of buyer requests and supplier quotes.</p>

      {rfqs.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          No RFQs yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-ink-dim">
                <th className="py-2 pr-3">Reference</th>
                <th className="py-2 pr-3">Buyer</th>
                <th className="py-2 pr-3">Supplier</th>
                <th className="py-2 pr-3">Items</th>
                <th className="py-2 pr-3">Quotes</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs text-ink">{r.publicRef ?? r.id.slice(0, 8)}</td>
                  <td className="py-2 pr-3 text-ink-muted">{r.buyer?.email ?? "—"}</td>
                  <td className="py-2 pr-3 text-ink-muted">{r.supplierName ?? "—"}</td>
                  <td className="py-2 pr-3 text-ink-dim">{r.items.length || 1}</td>
                  <td className="py-2 pr-3 text-ink-dim">{r.quotes.length}</td>
                  <td className="py-2 pr-3 capitalize text-ink">{r.status}</td>
                  <td className="py-2 pr-3 text-ink-dim">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
