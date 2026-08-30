"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BadgeCheck,
  Star,
  Clock,
  Truck,
  RotateCcw,
  Package,
  Award,
} from "lucide-react";
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

function MetricPill({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock;
  value: string;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-ink-muted"
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
      <span className="font-semibold tabular-nums text-ink">{value}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

export default function SupplierCard({ supplier }: SupplierCardProps) {
  const t = useTranslations("suppliers");
  const tCommon = useTranslations("common");
  const s = toDisplaySupplier(supplier);

  return (
    <article className="glass-card glass-hover flex flex-col overflow-hidden p-0">
      <div
        className="relative h-28 overflow-hidden sm:h-32"
        style={{ backgroundImage: s.bannerGradient }}
      >
        <ImageWithFallback
          src={s.imageUrl}
          fallbackSrc={getSupplierFallbackImage(supplier.category ?? supplier.industry, s.name)}
          placeholderSrc={GENERIC_SUPPLIER_PLACEHOLDER}
          alt={`${s.name} facility`}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-navy-dark/50 via-navy-dark/10 to-transparent"
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
          className="absolute left-3 top-3"
        />
        <SupplierLogo
          logoUrl={s.logoUrl}
          initials={s.logoText}
          gradient={s.logoGradient}
          name={s.name}
          className="absolute -bottom-8 left-5 h-16 w-16 rounded-2xl text-xl font-extrabold shadow-cardHover ring-4 ring-white"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-5 pt-10">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold leading-snug text-ink">{s.name}</h3>
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-cyan/10 px-2 py-0.5 text-[11px] font-bold text-cyan"
              title="Suplymate supplier score"
            >
              <Award className="h-3 w-3" aria-hidden />
              {s.score}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <span aria-hidden>{s.flag}</span>
              {s.country}
            </span>
            <span
              className="inline-flex items-center gap-1 font-semibold text-ink"
              aria-label={tCommon("starsRating", { rating: s.rating.toFixed(1) })}
            >
              <Star className="h-3.5 w-3.5 fill-mustard text-mustard" aria-hidden />
              {s.rating.toFixed(1)}
            </span>
            <span className="text-ink-dim">
              ({s.reviewCount} {t("reviewsLabel")})
            </span>
          </div>
          <p className="mt-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              {s.categoryLabel}
            </span>
            <span className="ml-2 text-xs text-ink-dim">
              {s.yearsInBusiness} yrs · {s.employees} staff
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <MetricPill
            icon={Truck}
            value={`${s.onTimeDelivery}%`}
            label={t("onTimeDeliveryShort")}
          />
          <MetricPill icon={Clock} value={s.responseTime} label={t("responseTimeShort")} />
          <MetricPill
            icon={RotateCcw}
            value={`${s.reorderRate}%`}
            label={t("reorderRateShort")}
          />
        </div>

        {s.products.length > 0 && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-dim">
              {t("featuredProducts")}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {s.products.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="min-w-[5.5rem] shrink-0 rounded-lg border border-white bg-white p-2 shadow-sm"
                >
                  <div
                    className="mb-1.5 flex h-10 items-center justify-center rounded-md"
                    style={{ backgroundImage: p.gradient }}
                  >
                    <Package className="h-4 w-4 text-cyan" aria-hidden />
                  </div>
                  <p className="truncate text-[10px] font-semibold text-ink" title={p.name}>
                    {p.name}
                  </p>
                  <p className="text-[10px] font-bold text-cyan">{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          <Link
            href={`/supplier/${s.id}`}
            className="btn-secondary flex-1 justify-center py-2.5 text-sm"
          >
            {t("viewProfile")}
          </Link>
          <ContactSupplierButton
            supplierId={s.id}
            supplierName={s.name}
            label={t("contactSupplier")}
            className="btn-accent inline-flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm"
          />
        </div>
        {s.sourceUrl && (
          <a
            href={s.sourceUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-center text-[10px] text-ink-dim transition-colors hover:text-cyan"
          >
            {t("sourceListing")}
          </a>
        )}
      </div>
    </article>
  );
}
