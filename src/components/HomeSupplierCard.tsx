"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, MapPin, Shield, ArrowRight } from "lucide-react";

export type HomeSupplierCardProps = {
  logoText: string;
  companyName: string;
  category: string;
  description: string;
  location: string;
  reliabilityScore: number;
  verified: boolean;
  /** Optional gradient (tailwind from/via/to classes) for logo + cover */
  logoGradient?: string;
  /** Destination for the View Supplier button */
  href?: string;
};

const LOGO_GRADIENTS = [
  "from-navy via-navy-mid to-cyan",
  "from-cyan via-teal to-emerald",
  "from-navy-dark via-navy to-teal",
  "from-teal via-cyan to-cyan-glow",
  "from-navy-mid via-cyan to-mustard",
  "from-navy via-teal to-mustard-light",
];

function getLogoGradient(logoText: string, override?: string) {
  if (override) return override;
  const index =
    logoText.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    LOGO_GRADIENTS.length;
  return LOGO_GRADIENTS[index];
}

export default function HomeSupplierCard({
  logoText,
  companyName,
  category,
  description,
  location,
  reliabilityScore,
  verified,
  logoGradient,
  href = "/suppliers",
}: HomeSupplierCardProps) {
  const gradient = getLogoGradient(logoText, logoGradient);
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-[border-color,box-shadow] duration-300 ease-cinema hover:border-cyan/40 hover:shadow-cardHover"
      whileHover={reduceMotion ? undefined : { y: -8 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
    >
      {/* Gradient cover banner */}
      <div className={`relative h-16 bg-gradient-to-r ${gradient}`}>
        <div className="absolute inset-0 ai-grid-bg opacity-30" />
        {verified && (
          <motion.span
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm"
            initial={{ opacity: 0.9 }}
            whileHover={reduceMotion ? undefined : { scale: 1.08 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Verified
          </motion.span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6">
        {/* Logo avatar overlapping the banner */}
        <motion.div
          className={`-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-base font-bold tracking-wide text-white shadow-glow ring-4 ring-white`}
          whileHover={
            reduceMotion
              ? undefined
              : {
                  scale: 1.06,
                  boxShadow:
                    "0 0 30px rgba(2,132,199,0.5), 0 8px 24px rgba(15,23,42,0.14)",
                }
          }
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          {logoText}
        </motion.div>

        <div className="mt-4 flex-1">
          <h3 className="text-lg font-semibold text-ink">{companyName}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-cyan">
            {category}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
            {location}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-ink"
            title="Suplymate reliability score"
          >
            <Shield className="h-3.5 w-3.5 text-mustard" aria-hidden />
            {reliabilityScore}/100
          </span>
        </div>

        <Link
          href={href}
          className="group/btn mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-all duration-300 ease-cinema hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan"
        >
          View Supplier
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </motion.article>
  );
}
