"use client";

import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Shield } from "lucide-react";

export type HomeSupplierCardProps = {
  logoText: string;
  companyName: string;
  category: string;
  description: string;
  location: string;
  reliabilityScore: number;
  verified: boolean;
  /** Optional gradient class for logo circle */
  logoGradient?: string;
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
}: HomeSupplierCardProps) {
  const gradient = getLogoGradient(logoText, logoGradient);

  return (
    <motion.article
      className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-[border-color,box-shadow] duration-300 ease-cinema hover:border-cyan/40 hover:shadow-cardHover"
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >

      <div className="relative flex items-start justify-between gap-3">
        <motion.div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-sm font-bold tracking-wide text-white shadow-glow ring-2 ring-white`}
          whileHover={{
            scale: 1.06,
            boxShadow: "0 0 28px rgba(2,132,199,0.45), 0 8px 24px rgba(15,23,42,0.12)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          {logoText}
        </motion.div>

        {verified && (
          <motion.span
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Verified
          </motion.span>
        )}
      </div>

      <div className="relative mt-5 flex-1">
        <h3 className="text-lg font-semibold text-ink">{companyName}</h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-cyan">
          {category}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
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
    </motion.article>
  );
}
