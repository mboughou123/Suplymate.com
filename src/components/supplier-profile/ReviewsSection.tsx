"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { MessageSquareQuote, Star } from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, StarRating, reveal } from "./primitives";

/**
 * Ratings and reviews.
 *
 * This section previously rendered five to eight fabricated reviews per
 * supplier — invented authors, invented buyer companies, invented bodies, and a
 * "verified purchase" badge assigned at random — plus a star distribution
 * derived from them.
 *
 * Suplymate has collected no buyer reviews, so there are none to show. Where a
 * Google Places rating exists it is shown and attributed to Google, because it
 * is somebody else's rating rather than a platform review.
 */
export default function ReviewsSection({
  profile,
}: {
  profile: SupplierProfile;
}) {
  const t = useTranslations("supplierProfile");
  const { rating, reviewCount } = profile.base;
  const hasGoogleRating = rating !== null && reviewCount !== null;

  return (
    <motion.section
      {...reveal}
      transition={{ duration: 0.6 }}
      className="py-8 sm:py-10"
    >
      <SectionHeading
        eyebrow={t("reputationEyebrow")}
        title={t("ratingsTitle")}
        description={t("ratingsDescription")}
        icon={<MessageSquareQuote className="h-5 w-5" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {hasGoogleRating ? (
          <div className="glass-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-dim">
              {t("googleRatingLabel")}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-ink">
                {rating.toFixed(1)}
              </span>
              <div>
                <StarRating rating={rating} size="h-4 w-4" />
                <p className="mt-1 text-xs text-ink-dim">
                  {t("googleReviewCount", { count: reviewCount })}
                </p>
              </div>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-xs text-ink-dim">
              {t("googleRatingDisclaimer")}
            </p>
          </div>
        ) : (
          <div className="glass-card p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-dim">
              {t("googleRatingLabel")}
            </p>
            <p className="mt-2 text-body text-ink-muted">{t("noGoogleRating")}</p>
          </div>
        )}

        <div className="glass-card flex flex-col justify-center p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-base text-ink-dim">
            <Star className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 text-body font-semibold text-ink">
            {t("noPlatformReviewsTitle")}
          </p>
          <p className="mt-1.5 text-body text-ink-muted">
            {t("noPlatformReviewsBody")}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
