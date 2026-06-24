import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ShieldCheck } from "lucide-react";
import ClaimReviewActions from "@/components/admin/ClaimReviewActions";

export const metadata: Metadata = {
  title: "Supplier claims · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700",
  NEEDS_INFORMATION: "bg-amber-50 text-amber-800",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-slate-100 text-slate-500",
  STARTED: "bg-slate-100 text-slate-600",
};

export default async function AdminClaimsPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/supplier-claims");
  if (!ok) redirect("/");

  const claims = await prisma.supplierClaim
    .findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-ink-muted hover:text-cyan">← Admin</Link>
      <h1 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <ShieldCheck className="h-6 w-6 text-cyan" aria-hidden />
        Supplier claims
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Approving a claim links the profile to the claimant&apos;s account. It does <strong>not</strong>{" "}
        verify the supplier — use the supplier status control to grant Verified.
      </p>

      {claims.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          No claims yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {claims.map((c) => (
            <li key={c.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/supplier/${c.supplierId}`} className="font-semibold text-ink hover:text-cyan">
                  {c.supplierName}
                </Link>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[c.status] ?? "bg-slate-100"}`}>
                  {c.status}
                </span>
                <span className="ml-auto text-xs text-ink-dim">{new Date(c.updatedAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {c.user?.name} ({c.user?.email}){c.role ? ` · ${c.role}` : ""}
              </p>
              <p className="mt-1 text-xs text-ink-dim">
                {c.workEmail ? `Work email: ${c.workEmail}. ` : ""}
                {c.phone ? `Phone: ${c.phone}. ` : ""}
                {c.evidenceUrl ? (
                  <a href={c.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-cyan hover:underline">Evidence link</a>
                ) : null}
              </p>
              {c.note && <p className="mt-1 text-sm text-ink">{c.note}</p>}
              {(c.status === "SUBMITTED" || c.status === "NEEDS_INFORMATION") && (
                <ClaimReviewActions claimId={c.id} />
              )}
              {c.adminNote && <p className="mt-2 text-xs text-ink-dim">Admin note: {c.adminNote}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
