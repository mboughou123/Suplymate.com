import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSuppliersFromDb } from "@/lib/data-service";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import ReportButton from "@/components/ReportButton";

export const metadata: Metadata = {
  title: "Compare suppliers | Suplymate",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ ids?: string }>;
};

export default async function CompareSuppliersPage({ searchParams }: Props) {
  const { ids: rawIds } = await searchParams;
  const ids = (rawIds ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (ids.length < 2) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Compare suppliers</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Select 2–4 suppliers from the{" "}
          <Link href="/suppliers" className="text-cyan hover:underline">
            supplier directory
          </Link>{" "}
          to compare verified status, location, and Google ratings (when available).
        </p>
      </div>
    );
  }

  const all = await getSuppliersFromDb();
  const selected = ids
    .map((id) => all.find((s) => s.id === id))
    .filter(Boolean);

  if (selected.length < 2) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/suppliers" className="text-xs font-medium text-cyan hover:underline">
        ← Back to suppliers
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">Supplier comparison</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Side-by-side view of directory facts only — no fabricated reliability scores or pricing.
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-ink-dim">
            <tr>
              <th className="px-4 py-3">Attribute</th>
              {selected.map((s) => (
                <th key={s!.id} className="px-4 py-3 font-semibold normal-case text-ink">
                  {s!.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3 text-ink-dim">Verification</td>
              {selected.map((s) => (
                <td key={s!.id} className="px-4 py-3">
                  {s!.verified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <BadgeCheck className="h-4 w-4" aria-hidden /> Verified
                    </span>
                  ) : (
                    <span className="text-ink-muted">Listed (not verified)</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-ink-dim">Location</td>
              {selected.map((s) => (
                <td key={s!.id} className="px-4 py-3 text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {s!.location}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-ink-dim">Category</td>
              {selected.map((s) => (
                <td key={s!.id} className="px-4 py-3 text-ink-muted">
                  {s!.category ?? s!.industry}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-ink-dim">Google rating</td>
              {selected.map((s) => (
                <td key={s!.id} className="px-4 py-3">
                  {s!.googleRating != null ? (
                    <span className="inline-flex items-center gap-1 font-medium text-ink">
                      <Star className="h-4 w-4 fill-mustard text-mustard" aria-hidden />
                      {s!.googleRating.toFixed(1)}
                      {s!.googleReviews != null && (
                        <span className="text-xs font-normal text-ink-dim">
                          ({s!.googleReviews} reviews)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-ink-dim">Not available</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-ink-dim">Profile</td>
              {selected.map((s) => (
                <td key={s!.id} className="px-4 py-3">
                  <Link href={`/supplier/${s!.id}`} className="text-cyan hover:underline">
                    View profile
                  </Link>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-ink-dim">Report</td>
              {selected.map((s) => (
                <td key={s!.id} className="px-4 py-3">
                  <ReportButton targetType="SUPPLIER" targetId={s!.id} label="Report" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
