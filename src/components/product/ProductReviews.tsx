import { BadgeCheck } from "lucide-react";
import type { ProductReview, ReviewSummary } from "@/lib/product-detail";
import { StarRating } from "@/components/supplier-profile/primitives";

export default function ProductReviews({
  summary,
  reviews,
}: {
  summary: ReviewSummary;
  reviews: ProductReview[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:sticky lg:top-24 lg:self-start">
        <div className="text-center">
          <p className="text-5xl font-extrabold text-ink">{summary.average.toFixed(1)}</p>
          <div className="mt-2 flex justify-center">
            <StarRating rating={summary.average} size="h-5 w-5" />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {summary.total.toLocaleString()} verified reviews
          </p>
        </div>
        <div className="mt-5 space-y-1.5">
          {summary.distribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-ink-muted">{d.stars}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mustard to-gold-light"
                  style={{ width: `${d.pct}%` }}
                />
              </div>
              <span className="w-7 text-right text-ink-dim">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-mid text-sm font-bold text-white">
                  {r.author.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{r.company}</p>
                  <p className="text-xs text-ink-dim">
                    {r.flag} {r.author} · {r.country}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <StarRating rating={r.rating} />
                <p className="mt-0.5 text-[11px] text-ink-dim">{r.date}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">{r.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{r.body}</p>
            {r.verifiedPurchase && (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified purchase
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
