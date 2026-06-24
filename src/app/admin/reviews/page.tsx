import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { Star } from "lucide-react";
import ModerationActions from "@/components/admin/ModerationActions";

export const metadata: Metadata = {
  title: "Reviews · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const CLS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-slate-100 text-slate-500",
  REMOVED: "bg-red-50 text-red-700",
};

export default async function AdminReviewsPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/reviews");
  if (!ok) redirect("/");

  const reviews = await prisma.review
    .findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { author: { select: { name: true, email: true } } },
    })
    .catch(() => []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-ink-muted hover:text-cyan">← Admin</Link>
      <h1 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Star className="h-6 w-6 text-cyan" aria-hidden />
        Reviews
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Reviews are submitted only after a qualifying interaction and stay hidden until published.
      </p>

      {reviews.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          No reviews yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/supplier/${r.supplierId}`} className="font-semibold text-ink hover:text-cyan">{r.supplierName}</Link>
                <span className="text-amber-500">{"★".repeat(r.rating)}<span className="text-slate-300">{"★".repeat(5 - r.rating)}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CLS[r.status] ?? "bg-slate-100"}`}>{r.status}</span>
                <span className="ml-auto text-xs text-ink-dim">{r.qualifyingType ?? "—"}</span>
              </div>
              {r.title && <p className="mt-1 font-medium text-ink">{r.title}</p>}
              <p className="mt-1 text-sm text-ink-muted">{r.body}</p>
              <p className="mt-1 text-xs text-ink-dim">by {r.author?.name} ({r.author?.email})</p>
              <div className="mt-3">
                <ModerationActions
                  endpoint={`/api/admin/reviews/${r.id}`}
                  actions={[
                    { label: "Publish", status: "PUBLISHED", tone: "primary" },
                    { label: "Reject", status: "REJECTED", tone: "muted" },
                    { label: "Remove", status: "REMOVED", tone: "danger" },
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
