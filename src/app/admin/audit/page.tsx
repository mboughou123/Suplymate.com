import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Audit log | Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/audit");
  if (!ok) redirect("/");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-xs font-medium text-cyan hover:underline">
        ← Admin
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">Audit log</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Recent privileged actions (RFQ creation, claims, moderation, onboarding).
      </p>

      {logs.length === 0 ? (
        <p className="mt-8 text-sm text-ink-dim">No audit entries yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-ink-dim">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-ink-dim">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{l.actor ?? l.actorId ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium text-ink">{l.action}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-muted">
                    {l.targetType}
                    {l.targetId ? ` · ${l.targetId.slice(0, 8)}…` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
