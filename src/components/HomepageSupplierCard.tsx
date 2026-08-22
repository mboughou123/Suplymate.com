"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { MapPin, Star, ArrowRight } from "lucide-react";
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
  /** Google Places rating; null when the supplier has none. */
  rating: number | null;
  /** Google Places review count; null when the supplier has none. */
  reviewCount: number | null;
  verified: boolean;
  description?: string;
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
  description,
  coverImage,
  coverFallback,
  logoUrl,
  logoInitials,
  logoGradient,
  href,
}: HomepageSupplierCardProps) {
  const t = useTranslations("suppliers");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 ease-cinema hover:-translate-y-1 hover:border-cyan/30 hover:shadow-cardHover motion-reduce:transform-none">
      <div className="relative aspect-[16/9] overflow-hidden bg-base">
        <ImageWithFallback
          src={coverImage}
          fallbackSrc={coverFallback}
          placeholderSrc={GENERIC_SUPPLIER_PLACEHOLDER}
          alt={`${name} — ${category}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-500 ease-cinema group-hover:scale-[1.04] motion-reduce:transform-none"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-navy-dark/45 via-transparent to-transparent"
        />
        <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-navy-dark/60 px-2.5 py-1 text-caption font-medium text-white backdrop-blur">
          <span aria-hidden>{flag}</span>
          {country}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        {/* Logo overlapping the cover */}
        <div className="-mt-7">
          <SupplierLogo
            logoUrl={logoUrl}
            initials={logoInitials}
            gradient={logoGradient}
            name={name}
            className="h-14 w-14 rounded-xl text-sm ring-4 ring-surface shadow-card"
          />
        </div>

        <div className="mt-3 flex-1">
          <h3 className="text-heading-sm leading-snug text-ink">{name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-caption font-semibold uppercase tracking-wide text-cyan">
              {category}
            </span>
            {rating !== null && (
              <>
                <span
                  aria-hidden
                  className="h-0.5 w-0.5 rounded-full bg-slate-300"
                />
                <span className="inline-flex items-center gap-1 text-caption font-semibold tabular-nums text-ink">
                  <Star
                    className="h-3.5 w-3.5 fill-mustard-light text-mustard-light"
                    aria-hidden
                  />
                  {rating.toFixed(1)}
                  {reviewCount !== null && (
                    <span className="font-normal text-ink-dim">
                      ({reviewCount})
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
          {description && (
            <p className="mt-3 line-clamp-2 text-body-sm text-ink-muted">
              {description}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-ink-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-dim" aria-hidden />
            <span className="truncate">{location}</span>
          </span>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-body-sm font-semibold text-cyan transition-colors hover:text-navy cursor-pointer"
          >
            {t("viewSupplier")}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 ease-cinema group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden
            />
            {/* Stretched link: whole card is clickable */}
            <span aria-hidden className="absolute inset-0" />
          </Link>
        </div>
      </div>
    </article>
  );
}
