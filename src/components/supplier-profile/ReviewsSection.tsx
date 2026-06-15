"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquareQuote, Sparkles, BadgeCheck, ThumbsUp } from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, AnimatedBar, StarRating, reveal } from "./primitives";

export default function ReviewsSection({ profile }: { profile: SupplierProfile }) {
  const { reviews, reviewSummary } = profile;
  const [filter, setFilter] = useState<"all" | "verified" | 5 | 4 | 3>("all");

  const visible = useMemo(() => {
    if (filter === "all") return reviews;
    if (filter === "verified") return reviews.filter((r) => r.verifiedPurchase);
    return reviews.filter((r) => r.rating === filter);
  }, [reviews, filter]);

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All reviews" },
    { key: "verified", label: "Verified purchase" },
    { key: 5, label: "5 star" },
    { key: 4, label: "4 star" },
    { key: 3, label: "3 star" },
  ];

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Reputation"
        title="Buyer reviews"
        description="Verified feedback from B2B buyers, scored on service, shipping and quality."
        icon={<MessageSquareQuote className="h-5 w-5" />}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Summary panel */}
        <div className="space-y-4">
          <div className="glass-card p-5 text-center">
            <p className="text-5xl font-extrabold tracking-tight text-ink">
              {reviewSummary.average.toFixed(1)}
            </p>
            <div className="mt-1 flex justify-center">
              <StarRating rating={reviewSummary.average} size="h-5 w-5" />
            </div>
            <p className="mt-1 text-xs text-ink-dim">
              {reviewSummary.total.toLocaleString()} verified reviews
            </p>
            <div className="mt-4 space-y-1.5">
              {reviewSummary.distribution.map((d) => (
                <div key={d.stars} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-ink-muted">{d.stars}</span>
                  <div className="flex-1">
                    <AnimatedBar value={d.pct} color="gold" height="h-1.5" />
                  </div>
                  <span className="w-8 text-right text-ink-dim">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card space-y-3 p-5">
            {[
              { label: "Service", value: reviewSummary.avgService },
              { label: "Shipping", value: reviewSummary.avgShipping },
              { label: "Quality", value: reviewSummary.avgQuality },
            ].map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">{s.label}</span>
                  <span className="font-bold text-ink">{s.value.toFixed(1)}/5</span>
                </div>
                <AnimatedBar value={(s.value / 5) * 100} color="cyan" height="h-1.5" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-ai-glow/20 bg-ai-mist/60 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-cyan">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> AI review summary
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{reviewSummary.aiSummary}</p>
          </div>
        </div>

        {/* Reviews list */}
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={String(f.key)}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === f.key
                    ? "bg-cyan text-white shadow-glow"
                    : "border border-slate-200 bg-white text-ink-muted hover:border-cyan/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visible.map((r, i) => (
              <motion.article
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 5) * 0.05, duration: 0.4 }}
                className="glass-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan/15 to-teal/15 text-lg" aria-hidden>
                      {r.flag}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">{r.author}</p>
                      <p className="text-xs text-ink-dim">
                        {r.company} · {r.country}
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

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-dim">
                  <span>Service <strong className="text-ink">{r.service}/5</strong></span>
                  <span>Shipping <strong className="text-ink">{r.shipping}/5</strong></span>
                  <span>Quality <strong className="text-ink">{r.quality}/5</strong></span>
                  {r.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified purchase
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> {r.helpful}
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
