"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, MapPin, Truck, ArrowRight, PackageCheck } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";
import { getProductFallbackImage } from "@/lib/image-fallback";
import type { PublicProductCard as PublicProduct } from "@/lib/public-products";

type Props = { data: PublicProduct };

export default function PublicProductCard({ data: d }: Props) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-[border-color,box-shadow] duration-300 hover:border-cyan/40 hover:shadow-cardHover">
      <Link href={`/products/${d.id}`} className="relative block shrink-0">
        <div className="relative flex h-44 items-center justify-center overflow-hidden bg-slate-100">
          <ImageWithFallback
            src={d.hasRealPhoto ? d.imageUrl : undefined}
            fallbackSrc={d.imageUrl || getProductFallbackImage(d.name, d.category)}
            alt={d.name}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {d.verified && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              {tc("verified")}
            </span>
          )}
          <span className="absolute right-3 top-3 rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            {d.category}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/products/${d.id}`}>
          <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold text-ink transition-colors group-hover:text-cyan">
            {d.name}
          </h3>
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {d.supplierVisible && d.supplierId ? (
            <Link
              href={`/supplier/${d.supplierId}`}
              className="inline-flex items-center gap-1 hover:text-cyan"
            >
              <MapPin className="h-3 w-3 text-cyan" aria-hidden />
              {d.supplierName}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-cyan" aria-hidden />
              {d.supplierName}
            </span>
          )}
          {d.supplierCountry && (
            <span className="text-ink-dim">{d.supplierCountry}</span>
          )}
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
          {d.priceLabel ? (
            <>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-dim">
                {t("price")}
              </p>
              <p className="text-lg font-bold text-cyan">{d.priceLabel}</p>
              {d.priceNote && (
                <p
                  className="mt-1 line-clamp-2 text-[10px] leading-snug text-ink-dim"
                  title={d.priceNote}
                >
                  {d.priceNote}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-dim">
                {t("price")}
              </p>
              <p className="text-lg font-bold text-cyan">{tc("rfq")}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{tc("priceOnRequest")}</p>
              {d.priceNote && (
                <p
                  className="mt-1 line-clamp-2 text-[10px] leading-snug text-ink-dim"
                  title={d.priceNote}
                >
                  {d.priceNote}
                </p>
              )}
            </>
          )}
        </div>

        {(d.moq || d.shippingTime) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
            {d.moq && (
              <span className="inline-flex items-center gap-1">
                <PackageCheck className="h-3.5 w-3.5 text-teal" aria-hidden />
                {t("moqLabel")}: <span className="font-semibold text-ink">{d.moq}</span>
              </span>
            )}
            {d.shippingTime && (
              <span className="inline-flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-teal" aria-hidden />
                {d.shippingTime}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex min-h-[44px] gap-2 pt-4">
          <Link
            href={`/products/${d.id}`}
            className="group/btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink transition-all duration-300 hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan"
          >
            {t("viewProduct")}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <ContactSupplierButton
            supplierId={d.supplierId}
            supplierName={d.supplierName}
            label={t("requestQuote")}
            productName={d.name}
            productId={d.id}
            className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm"
          />
        </div>
      </div>
    </article>
  );
}
