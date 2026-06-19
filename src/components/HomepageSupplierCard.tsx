"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, MapPin, Star, ArrowRight } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import SupplierLogo from "@/components/SupplierLogo";
import { GENERIC_SUPPLIER_PLACEHOLDER } from "@/lib/image-fallback";

export type HomepageSupplierCardProps = {
  id: string;
  name: string;
  category: string;
  location: string;
  country: string;
  flag: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  description: string;
  /** Real cover/business photo (DB/CDN); may be empty. */
  coverImage?: string;
  /** Category-based fallback cover. */
  coverFallback: string;
  /** Real logo image (DB/CDN); may be empty. */
  logoUrl?: string;
  /** Initials shown when no logo image. */
  logoInitials: string;
  /** Inline CSS gradient for the initials avatar. */
  logoGradient: string;
  href: string;
};

export default function HomepageSupplierCard({
  name,
  category,
  location,
  country,
  flag,
  rating,
  reviewCount,
  verified,
  description,
  coverImage,
  coverFallback,
  logoUrl,
  logoInitials,
  logoGradient,
  href,
}: HomepageSupplierCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-[border-color,box-shadow] duration-300 ease-cinema hover:border-cyan/40 hover:shadow-cardHover"
      whileHover={reduceMotion ? undefined : { y: -8 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
    >
      {/* Cover / business photo */}
      <div className="relative h-36 overflow-hidden">
        <ImageWithFallback
          src={coverImage}
          fallbackSrc={coverFallback}
          placeholderSrc={GENERIC_SUPPLIER_PLACEHOLDER}
          alt={`${name} — ${category}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-500 ease-cinema group-hover:scale-110"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-navy-dark/55 via-navy-dark/10 to-transparent"
        />
        {verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm transition-shadow duration-300 group-hover:shadow-glow">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Verified
          </span>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          <span aria-hidden>{flag}</span>
          {country}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        {/* Logo overlapping the cover */}
        <div className="-mt-8">
          <SupplierLogo
            logoUrl={logoUrl}
            initials={logoInitials}
            gradient={logoGradient}
            name={name}
          />
        </div>

        <div className="mt-3 flex-1">
          <h3 className="text-lg font-semibold leading-tight text-ink">{name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold uppercase tracking-wide text-cyan">
              {category}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Star className="h-3.5 w-3.5 fill-mustard text-mustard" aria-hidden />
              {rating.toFixed(1)}
              <span className="font-normal text-ink-dim">({reviewCount})</span>
            </span>
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-xs text-ink-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
          <span className="truncate">{location}</span>
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
