import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Database } from "lucide-react";
import { MARKETPLACE_STATUSES } from "@/lib/verification";
import SupplierStatusControl from "@/components/admin/SupplierStatusControl";
import FlagExpiredButton from "@/components/admin/FlagExpiredButton";

export const metadata: Metadata = {
  title: "Data quality · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DataQualityPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/data-quality");
  if (!ok) redirect("/");

  const now = new Date();
  const [
    statusGroups,
    totalSuppliers,
    dpGroups,
    expiredCerts,
    needsReview,
  ] = await Promise.all([
    prisma.supplier.groupBy({ by: ["marketplaceStatus"], _count: true }).catch(() => []),
    prisma.supplier.count().catch(() => 0),
    prisma.dataPoint.groupBy({ by: ["reviewStatus"], _count: true }).catch(() => []),
    prisma.certification
      .count({ where: { expirationDate: { lt: now }, status: { notIn: ["expired", "rejected"] } } })
      .catch(() => 0),
    prisma.supplier
      .findMany({
        where: { marketplaceStatus: { in: ["PENDING_REVIEW", "NEEDS_INFORMATION", "CLAIMED", "REVIEWED"] } },
        select: { id: true, name: true, marketplaceStatus: true, claimedByUserId: true },
        take: 100,
        orderBy: { updatedAt: "desc" },
      })
      .catch(() => []),
  ]);

  const statusMap = new Map(statusGroups.map((g) => [g.marketplaceStatus, g._count as number]));
  const dpMap = new Map(dpGroups.map((g) => [g.reviewStatus, g._count as number]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-ink-muted hover:text-cyan">← Admin</Link>
      <h1 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Database className="h-6 w-6 text-cyan" aria-hidden />
        Data quality
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Verification lifecycle, data provenance, and certification freshness. Verified status is
        granted only by explicit admin action.
      </p>

      {/* Verification lifecycle distribution */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
          Suppliers by status ({totalSuppliers.toLocaleString()} total)
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MARKETPLACE_STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-slate-200 p-3">
              <p className="text-lg font-bold text-ink">{(statusMap.get(s) ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-ink-dim">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Provenance review status */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
          Data points by review status
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["unverified", "reviewed", "verified", "disputed"].map((s) => (
            <div key={s} className="rounded-xl border border-slate-200 p-3">
              <p className="text-lg font-bold text-ink">{(dpMap.get(s) ?? 0).toLocaleString()}</p>
              <p className="text-[11px] capitalize text-ink-dim">{s}</p>
            </div>
          ))}
        </div>
        {dpMap.size === 0 && (
          <p className="mt-2 text-xs text-ink-dim">
            No per-field provenance recorded yet. Provenance is captured as fields are collected/edited.
          </p>
        )}
      </section>

      {/* Certification freshness */}
      <section className="mt-8 rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">Certification freshness</h2>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {expiredCerts} certification{expiredCerts === 1 ? "" : "s"} past expiration not yet flagged.
          </p>
          <FlagExpiredButton count={expiredCerts} />
        </div>
      </section>

      {/* Review queue with status control */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-dim">
          Needs attention ({needsReview.length})
        </h2>
        {needsReview.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-ink-muted">
            Nothing waiting on review.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {needsReview.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div>
                  <Link href={`/supplier/${s.id}`} className="font-medium text-ink hover:text-cyan">{s.name}</Link>
                  <span className="ml-2 text-[11px] text-ink-dim">{s.marketplaceStatus}{s.claimedByUserId ? " · claimed" : ""}</span>
                </div>
                <SupplierStatusControl supplierId={s.id} current={s.marketplaceStatus} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
