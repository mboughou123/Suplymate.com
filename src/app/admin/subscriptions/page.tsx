import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/billing";
import { CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Subscriptions · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/subscriptions");
  if (!ok) redirect("/");

  const [groups, recent] = await Promise.all([
    prisma.user.groupBy({ by: ["plan"], _count: true }).catch(() => []),
    prisma.user
      .findMany({
        where: { plan: { not: "free" } },
        select: { email: true, plan: true, planStatus: true, currentPeriodEnd: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      })
      .catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-ink-muted hover:text-cyan">← Admin</Link>
      <h1 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <CreditCard className="h-6 w-6 text-cyan" aria-hidden />
        Subscriptions
      </h1>

      {!isStripeConfigured() && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Stripe is not configured. Billing actions are disabled until the Stripe environment
          variables are set. Plan changes are managed by webhooks once configured.
        </p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        {["free", "starter", "pro"].map((p) => {
          const g = groups.find((x) => x.plan === p);
          return (
            <div key={p} className="rounded-xl border border-slate-200 p-4">
              <p className="text-lg font-bold text-ink">{(g?._count ?? 0).toLocaleString()}</p>
              <p className="text-xs capitalize text-ink-dim">{p}</p>
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-dim">Paid users</h2>
      {recent.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-ink-muted">
          No paid subscriptions yet.
        </p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-ink-dim">
              <th className="py-2">Email</th>
              <th className="py-2">Plan</th>
              <th className="py-2">Status</th>
              <th className="py-2">Renews</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((u) => (
              <tr key={u.email} className="border-b border-slate-100">
                <td className="py-2 text-ink-muted">{u.email}</td>
                <td className="py-2 capitalize text-ink">{u.plan}</td>
                <td className="py-2 text-ink-dim">{u.planStatus}</td>
                <td className="py-2 text-ink-dim">{u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
