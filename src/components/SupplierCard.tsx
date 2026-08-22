"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BadgeCheck, Star, MapPin, Package } from "lucide-react";
import type { Supplier } from "@/data/suppliers";
import { toDisplaySupplier } from "@/lib/supplier-display";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";
import FavoriteButton from "@/components/chat/FavoriteButton";
import ImageWithFallback from "@/components/ImageWithFallback";
import SupplierLogo from "@/components/SupplierLogo";
import {
  getSupplierFallbackImage,
  GENERIC_SUPPLIER_PLACEHOLDER,
} from "@/lib/image-fallback";

type SupplierCardProps = {
  supplier: Supplier;
};

export default function SupplierCard({ supplier }: SupplierCardProps) {
  const t = useTranslations("suppliers");
  const tCommon = useTranslations("common");
  const s = toDisplaySupplier(supplier);

  return (
    <article className="glass-card glass-hover flex flex-col overflow-hidden p-0">
      {/* Banner + logo + company image */}
      <div
        className="relative h-24 overflow-hidden"
        style={{ backgroundImage: s.bannerGradient }}
      >
        <ImageWithFallback
          src={s.imageUrl}
          fallbackSrc={getSupplierFallbackImage(supplier.category ?? supplier.industry, s.name)}
          placeholderSrc={GENERIC_SUPPLIER_PLACEHOLDER}
          alt={`${s.name} facility`}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {s.verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            {tCommon("verified")}
          </span>
        )}
        <FavoriteButton
          supplierId={s.id}
          supplierName={s.name}
          className="absolute left-[5.5rem] top-3"
        />
        <SupplierLogo
          logoUrl={s.logoUrl}
          initials={s.logoText}
          gradient={s.logoGradient}
          name={s.name}
          className="absolute -bottom-7 left-5 h-16 w-16 rounded-2xl text-xl font-extrabold shadow-cardHover ring-4 ring-white"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-9">
        {/* Identity */}
        <div>
          <h3 className="text-base font-bold leading-tight text-ink">{s.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <span aria-hidden>{s.flag}</span>
              {s.country}
            </span>
            {s.rating !== null && (
              <span
                className="inline-flex items-center gap-1 font-semibold text-ink"
                aria-label={tCommon("starsRating", { rating: s.rating.toFixed(1) })}
              >
                <Star
                  className="h-3.5 w-3.5 fill-mustard text-mustard"
                  aria-hidden
                />
                {s.rating.toFixed(1)}/5
              </span>
            )}
            {s.reviewCount !== null && (
              <span className="text-ink-dim">
                {tCommon("googleReviews", { count: s.reviewCount })}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-md bg-cyan/10 px-2 py-0.5 font-semibold text-cyan">
              {s.categoryLabel}
            </span>
            {/* The "Suplymate supplier score N/100" badge that sat here read as a
                quality verdict on the company, but the number is a ranking
                heuristic: mostly the Google rating restated, plus review volume
                and whether we hold a website and phone number. `score` still
                orders the directory; it is no longer published as a rating. */}
            <span className="inline-flex items-center gap-1 rounded-md bg-base px-2 py-0.5 text-ink-muted">
              <MapPin className="h-3 w-3" aria-hidden />
              {s.location}
            </span>
          </div>
        </div>

        {/* The on-time-delivery, response-time and reorder-rate row that sat here
            was generated from a hash of the supplier id. Nothing on the platform
            measures those, so the row is gone rather than estimated. */}

        {/* Recorded products. Prices and MOQs were likewise generated and have
            been removed; a buyer gets those by requesting a quote. */}
        {s.products.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-dim">
              {tCommon("recordedProducts")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {s.products.map((p, i) => (
                <div key={i} className="rounded-lg border border-line p-1.5">
                  <div
                    className="mb-1.5 flex h-14 items-center justify-center rounded-md"
                    style={{ backgroundImage: p.gradient }}
                  >
                    <Package className="h-5 w-5 text-cyan" aria-hidden />
                  </div>
                  <p
                    className="truncate text-[11px] font-semibold text-ink"
                    title={p.name}
                  >
                    {p.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-1">
          <Link
            href={`/supplier/${s.id}`}
            className="btn-secondary flex-1 justify-center"
          >
            {t("viewProfile")}
          </Link>
          <ContactSupplierButton
            supplierId={s.id}
            supplierName={s.name}
            label={t("contactSupplier")}
            className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5"
          />
        </div>
        {s.sourceUrl && (
          <a
            href={s.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-center text-[10px] text-ink-dim hover:text-cyan"
          >
            Source: public business listing
          </a>
        )}
      </div>
    </article>
  );
}
