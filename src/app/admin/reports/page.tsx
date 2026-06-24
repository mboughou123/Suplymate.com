import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Flag } from "lucide-react";
import ModerationActions from "@/components/admin/ModerationActions";

export const metadata: Metadata = {
  title: "Reports · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const CLS: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-800",
  REVIEWING: "bg-blue-50 text-blue-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  DISMISSED: "bg-slate-100 text-slate-500",
};

export default async function AdminReportsPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/reports");
  if (!ok) redirect("/");

  const reports = await prisma.report
    .findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { reporter: { select: { email: true } } },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-ink-muted hover:text-cyan">← Admin</Link>
      <h1 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Flag className="h-6 w-6 text-cyan" aria-hidden />
        Reports
      </h1>
      <p className="mt-1 text-sm text-ink-muted">User-submitted reports of suppliers, products, reviews, and messages.</p>

      {reports.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          No reports.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{r.targetType}</span>
                <span className="font-mono text-xs text-ink-dim">{r.targetId}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CLS[r.status] ?? "bg-slate-100"}`}>{r.status}</span>
                <span className="ml-auto text-xs text-ink-dim">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-ink">{r.reason}</p>
              {r.detail && <p className="mt-1 text-sm text-ink-muted">{r.detail}</p>}
              <p className="mt-1 text-xs text-ink-dim">Reported by {r.reporter?.email ?? "unknown"}</p>
              <div className="mt-3">
                <ModerationActions
                  endpoint={`/api/admin/reports/${r.id}`}
                  actions={[
                    { label: "Reviewing", status: "REVIEWING", tone: "primary" },
                    { label: "Resolve", status: "RESOLVED", tone: "primary" },
                    { label: "Dismiss", status: "DISMISSED", tone: "muted" },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
