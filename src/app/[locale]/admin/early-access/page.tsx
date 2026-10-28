import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Download, Mail } from "lucide-react";
import { checkStrictAdmin } from "@/lib/admin";
import { parseStoredCategories } from "@/lib/early-access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Early access · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  procurement: "Procurement / buyer",
  engineer: "Engineer",
  supplier: "Supplier / mill",
  other: "Other",
};

function sourceLabel(source: string | null): string {
  return source?.trim() || "(direct)";
}

async function loadEarlyAccess() {
  try {
    const [signups, grouped] = await Promise.all([
      prisma.earlyAccessSignup.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.earlyAccessSignup.groupBy({ by: ["utmSource"], _count: { _all: true } }),
    ]);
    const counts = grouped
      .map((row) => ({ source: sourceLabel(row.utmSource), count: row._count._all }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
    return { signups, counts, failed: false as const };
  } catch {
    return { signups: [], counts: [], failed: true as const };
  }
}

export default async function AdminEarlyAccessPage() {
  const { ok, authenticated, allowlistConfigured } = await checkStrictAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/early-access");
  if (!ok && allowlistConfigured) redirect("/");

  const loaded = ok ? await loadEarlyAccess() : { signups: [], counts: [], failed: false };
  const { signups, failed: loadFailed } = loaded;
  const counts = loaded.counts;

  const total = counts.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-ink-muted hover:text-cyan">
        ← Admin
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <Mail className="h-6 w-6 text-cyan" aria-hidden />
            Early access
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Signups from the pre-launch page, newest first. Counts are by first-touch utm_source.
          </p>
        </div>
        {ok && signups.length > 0 && (
          <a href="/api/admin/early-access/export" className="btn-secondary px-4 py-2 text-sm">
            <Download className="h-4 w-4" aria-hidden />
            Download CSV
          </a>
        )}
      </div>

      {!allowlistConfigured ? (
        <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Signups contain personal data, so this page needs an explicit admin list. Set{" "}
          <code className="rounded bg-white px-1">ADMIN_EMAILS</code> in Vercel to your email, then redeploy.
        </p>
      ) : loadFailed ? (
        <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          The early-access table is not available yet. A production deploy applies it automatically. To create it
          now, run <code className="rounded bg-white px-1">prisma/sql/early_access_signup.sql</code> against the
          database.
        </p>
      ) : signups.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          No signups yet.
        </p>
      ) : (
        <>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Signups by source">
            <li className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">All {total}</li>
            {counts.map((row) => (
              <li key={row.source} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-ink">
                <span className="font-semibold">{row.source}</span>
                <span className="text-ink-dim"> {row.count}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-6 space-y-3">
            {signups.map((signup) => {
              const categories = parseStoredCategories(signup.categories);
              return (
                <li key={signup.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`mailto:${signup.email}`} className="font-semibold text-cyan hover:underline">
                      {signup.email}
                    </a>
                    {signup.role && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {ROLE_LABEL[signup.role] ?? signup.role}
                      </span>
                    )}
                    <span className="rounded-md bg-cyan/10 px-2 py-0.5 text-[11px] font-medium text-cyan">
                      {sourceLabel(signup.utmSource)}
                    </span>
                    <span className="ml-auto text-xs text-ink-dim">{signup.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {[signup.name, signup.company, signup.locale?.toUpperCase()].filter(Boolean).join(" · ") || "No name or company"}
                  </p>
                  {categories.length > 0 && (
                    <p className="mt-2 text-xs text-ink-dim">{categories.join(", ")}</p>
                  )}
                  {signup.note && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{signup.note}</p>}
                  <p className="mt-2 break-all text-xs text-ink-dim">
                    {[
                      signup.utmMedium && `medium ${signup.utmMedium}`,
                      signup.utmCampaign && `campaign ${signup.utmCampaign}`,
                      signup.utmContent && `content ${signup.utmContent}`,
                      signup.landingPath,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No campaign details"}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
