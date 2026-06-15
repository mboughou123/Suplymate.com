"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Star,
  MapPin,
  Clock,
  Truck,
  Building2,
  Globe,
  ShieldCheck,
  Sparkles,
  FileText,
  Handshake,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import FavoriteButton from "@/components/chat/FavoriteButton";
import ProfileActionButton from "./ProfileActionButton";
import { RadialScore } from "./primitives";

export default function HeroSection({ profile }: { profile: SupplierProfile }) {
  const { base, trust, company, companySummary } = profile;
  const firstProduct = base.products[0]?.name;

  const indicators = [
    { icon: ShieldCheck, label: "Verified supplier", ok: base.verified },
    { icon: BadgeCheck, label: `${profile.certifications.length} certifications`, ok: true },
    { icon: Truck, label: `${trust.onTimeDelivery}% on-time`, ok: true },
    { icon: Clock, label: `Replies ${trust.responseTime}`, ok: true },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Dark glass banner */}
      <div className="relative h-56 sm:h-64" style={{ backgroundImage: base.bannerGradient }}>
        <div className="absolute inset-0 ai-grid-bg opacity-30" />
        <div
          className="absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(96,165,250,0.5), transparent 70%)" }}
        />
        <div className="container-page relative flex h-full items-end pb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Verified Supplier Profile
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
                  {base.logoText}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                      {base.name}
                    </h1>
                    {base.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-ink-muted">
                      <span aria-hidden className="text-base">{base.flag}</span>
                      {base.city}, {base.country}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-ink">
                      <Star className="h-4 w-4 fill-mustard text-mustard" aria-hidden />
                      {base.rating.toFixed(1)}
                      <span className="font-normal text-ink-dim">
                        ({base.reviewCount.toLocaleString()} reviews)
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-ink-muted">
                      <Building2 className="h-4 w-4 text-cyan" aria-hidden />
                      {company.yearsInBusiness} yrs in business
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-md bg-cyan/10 px-2.5 py-1 font-semibold text-cyan">
                      {base.categoryLabel}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-ink-muted">
                      {company.businessType}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 font-medium text-ink-muted">
                      <MapPin className="h-3 w-3" aria-hidden /> {company.factorySize}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI company summary */}
              <div className="rounded-xl border border-ai-glow/20 bg-ai-mist/60 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-cyan">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Suplymate AI company summary
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">{companySummary}</p>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-2">
                {indicators.map((ind) => (
                  <span
                    key={ind.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-muted"
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
                  label="Contact Supplier"
                  icon={undefined}
                  className="btn-primary"
                />
                <ProfileActionButton
                  supplierId={base.id}
                  supplierName={base.name}
                  intent="rfq"
                  label="Send RFQ"
                  icon={FileText}
                  productName={firstProduct}
                  className="btn-secondary"
                />
                <ProfileActionButton
                  supplierId={base.id}
                  supplierName={base.name}
                  intent="negotiate"
                  label="Start AI Negotiation"
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
                {base.website && (
                  <a
                    href={base.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="btn-ghost"
                  >
                    <Globe className="h-4 w-4" aria-hidden /> Website
                  </a>
                )}
              </div>
            </div>

            {/* Trust score dial */}
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 lg:w-56">
              <RadialScore value={trust.trustScore} label="Trust score" />
              <div className="text-center">
                <p className="text-xs font-semibold text-ink">Suplymate Trust Index</p>
                <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {trust.riskLevel} risk · {trust.aiConfidence}% AI confidence
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
