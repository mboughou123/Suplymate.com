"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, MapPin, Truck, ArrowRight, PackageCheck } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { getProductFallbackImage } from "@/lib/image-fallback";
import { parseMoq } from "@/lib/moq";
import type { PublicProductCard as PublicProduct } from "@/lib/public-products";

type Props = { data: PublicProduct };

export default function PublicProductCard({ data: d }: Props) {
  const t = useTranslations("products");
  const tc = useTranslations("common");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-cyan/35 hover:shadow-cardHover">
      <Link href={`/products/${d.id}`} className="relative block">
        <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 sm:h-44">
          <ImageWithFallback
            src={d.imageUrl}
            fallbackSrc={getProductFallbackImage(d.name, d.category)}
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
          <span className="absolute right-3 top-3 rounded-full bg-navy/75 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {d.category}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <Link href={`/products/${d.id}`}>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink transition-colors group-hover:text-cyan">
            {d.name}
          </h3>
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
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
            <>
              <span aria-hidden className="text-ink-dim">·</span>
              <span className="text-ink-dim">{d.supplierCountry}</span>
            </>
          )}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5">
          <div>
            {d.priceLabel ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-dim">
                  {t("price")}
                </p>
                <p className="text-lg font-bold tabular-nums text-cyan">{d.priceLabel}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-ink-muted">{tc("contactForPricing")}</p>
            )}
          </div>
          {(d.moq || d.shippingTime) && (
            <div className="text-right text-[11px] text-ink-muted">
              {d.moq && (
                <p className="inline-flex items-center justify-end gap-1">
                  <PackageCheck className="h-3 w-3 text-teal" aria-hidden />
                  {d.moq}
                </p>
              )}
              {d.shippingTime && (
                <p className="mt-0.5 inline-flex items-center justify-end gap-1">
                  <Truck className="h-3 w-3 text-teal" aria-hidden />
                  {d.shippingTime}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-stretch gap-2 pt-1 sm:mt-auto">
          <ContactSupplierButton
            supplierId={d.supplierId}
            supplierName={d.supplierName}
            label={t("requestQuote")}
            productName={d.name}
            productId={d.id}
            className="btn-accent inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm"
          />
          <Link
            href={`/products/${d.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink transition-all duration-200 hover:border-cyan/40 hover:bg-cyan/5 hover:text-cyan"
          >
            {t("viewProduct")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {d.supplierId && (
            <AddToCartButton
              compact
              label={t("addToCart")}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-cyan transition hover:border-cyan/40 hover:bg-cyan/5"
              item={{
                productId: d.id,
                productName: d.name,
                supplierId: d.supplierId,
                supplierName: d.supplierName,
                imageUrl: d.imageUrl,
                unit: d.priceUnit,
                moq: parseMoq(d.moq),
                sourceUrl: d.productUrl,
              }}
            />
          )}
        </div>
      </div>
    </article>
  );
}
