"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Star,
  Globe,
  FileText,
  Handshake,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import FavoriteButton from "@/components/chat/FavoriteButton";
import ReportButton from "@/components/ReportButton";
import ProfileActionButton from "./ProfileActionButton";
import { RadialScore } from "./primitives";

export default function HeroSection({ profile }: { profile: SupplierProfile }) {
  const t = useTranslations("supplierProfile");
  const { base, company, companySummary } = profile;
  const firstProduct = base.products[0]?.name;

  // Only signals with a real source. The row previously asserted a
  // certification count, an on-time-delivery percentage and a reply time, none
  // of which were measured. The "Verified supplier" entry has gone too: it read
  // `base.verified`, a flag the importer granted on Google rating alone.
  const indicators = [
    ...(company.website
      ? [{ icon: Globe, label: t("hasWebsite"), ok: true }]
      : []),
    ...(base.rating !== null
      ? [{ icon: Star, label: t("hasGoogleRating"), ok: true }]
      : []),
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Dark glass banner */}
      <div className="relative h-56 sm:h-64" style={{ backgroundImage: base.bannerGradient }}>
        {base.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={base.imageUrl}
            alt={`${base.name} facility`}
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 ai-grid-bg opacity-30" />
        <div
          className="absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(96,165,250,0.5), transparent 70%)" }}
        />
        <div className="container-page relative flex h-full items-end pb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t("directoryListing")}
          </span>
        </div>
      </div>

      {/* Identity card overlapping the banner */}
      <div className="container-page relative -mt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card overflow-hidden p-0"
        >
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:p-8">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start gap-5">
                {/* Logo */}
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-extrabold text-white shadow-cardHover ring-4 ring-white"
                  style={{ backgroundImage: base.logoGradient }}
                >
                  {base.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={base.logoUrl} alt={base.name} className="h-full w-full object-cover" />
                  ) : (
                    base.logoText
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                      {base.name}
                    </h1>
                    {/* No green "Verified" pill. It rendered on `base.verified`,
                        which the importer set from the Google rating alone. */}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-ink-muted">
                      <span aria-hidden className="text-base">{base.flag}</span>
                      {base.city}, {base.country}
                    </span>
                    {base.rating !== null && base.reviewCount !== null && (
                      <span className="inline-flex items-center gap-1 font-semibold text-ink">
                        <Star
                          className="h-4 w-4 fill-mustard text-mustard"
                          aria-hidden
                        />
                        {base.rating.toFixed(1)}
                        <span className="font-normal text-ink-dim">
                          {t("googleReviewCount", { count: base.reviewCount })}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md bg-cyan/10 px-2.5 py-1 font-semibold text-cyan">
                      {base.categoryLabel}
                    </span>
                    {company.moq && (
                      <span className="rounded-md bg-base px-2.5 py-1 font-medium text-ink-muted">
                        {t("minimumOrder")}: {company.moq}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Company summary. Either the supplier's own scraped description
                  or a sentence assembled from collected fields — never AI-written,
                  so it is no longer labelled as such. */}
              <div className="rounded-xl border border-line bg-base/80 p-4">
                <div className="mb-1.5 text-xs font-semibold text-ink-muted">
                  {t("aboutThisCompany")}
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {companySummary}
                </p>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-2">
                {indicators.map((ind) => (
                  <span
                    key={ind.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted"
                  >
                    <ind.icon
                      className={`h-3.5 w-3.5 ${ind.ok ? "text-emerald-600" : "text-ink-dim"}`}
                      aria-hidden
                    />
                    {ind.label}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-2.5">
                <ProfileActionButton
                  supplierId={base.id}
                  supplierName={base.name}
                  intent="contact"
                  label={t("contactSupplier")}
                  icon={undefined}
                  className="btn-primary"
                />
                <ProfileActionButton
                  supplierId={base.id}
                  supplierName={base.name}
                  intent="rfq"
                  label={t("sendRfq")}
                  icon={FileText}
                  productName={firstProduct}
                  className="btn-secondary"
                />
                <ProfileActionButton
                  supplierId={base.id}
                  supplierName={base.name}
                  intent="negotiate"
                  label={t("askAboutPricing")}
                  icon={Handshake}
                  productName={firstProduct}
                  className="btn-secondary"
                />
                <div className="relative">
                  <FavoriteButton
                    supplierId={base.id}
                    supplierName={base.name}
                    className="!h-11 !w-11"
                  />
                </div>
                <ReportButton targetType="SUPPLIER" targetId={base.id} />
                {base.website && (
                  <a
                    href={base.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="btn-ghost"
                  >
                    <Globe className="h-4 w-4" aria-hidden /> {t("website")}
                  </a>
                )}
              </div>
            </div>

            {/* Data-completeness dial. This measures how complete our record of
                the company is, so it is honest to publish. The risk level and
                "AI confidence" that sat beneath it were generated and are gone. */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 lg:w-56">
              <RadialScore
                value={profile.dataQuality.completenessScore}
                label={t("profileCompleteness")}
              />
              <p className="text-center text-[11px] leading-relaxed text-ink-dim">
                {t("completenessExplainer")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
