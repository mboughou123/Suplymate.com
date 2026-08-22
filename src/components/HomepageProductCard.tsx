"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Truck, Users, GitCompare } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import { GENERIC_PRODUCT_PLACEHOLDER } from "@/lib/image-fallback";

export type HomepageProductCardProps = {
  id: string;
  name: string;
  category: string;
  /** Real product image (DB/scraped); may be empty. */
  image?: string;
  /** Category-based fallback image. */
  imageFallback: string;
  /** Null when the product has no public price. */
  priceLabel: string | null;
  /** Supplier-stated MOQ; null when the record has none. */
  moq: string | null;
  /** Supplier-stated lead time; null when the record has none. */
  shippingTime: string | null;
  /**
   * The company that sells this product. Replaces a "N suppliers" count that
   * was hand-authored per catalogue row (8, 12, 6, ...) and counted nothing —
   * a product row belongs to exactly one supplier.
   */
  supplierName: string;
  href: string;
};

export default function HomepageProductCard({
  name,
  category,
  image,
  imageFallback,
  priceLabel,
  moq,
  shippingTime,
  supplierName,
  href,
}: HomepageProductCardProps) {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 ease-cinema hover:-translate-y-1 hover:border-cyan/30 hover:shadow-cardHover motion-reduce:transform-none">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-base cursor-pointer">
        <ImageWithFallback
          src={image}
          fallbackSrc={imageFallback}
          placeholderSrc={GENERIC_PRODUCT_PLACEHOLDER}
          alt={name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="h-full w-full object-cover transition-transform duration-300 ease-cinema group-hover:scale-[1.03] motion-reduce:transform-none"
        />
        <span className="absolute end-3 top-3 rounded-full bg-navy-dark/60 px-2.5 py-1 text-caption font-medium text-white backdrop-blur">
          {category}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={href} className="cursor-pointer">
          <h3 className="line-clamp-2 text-body font-semibold leading-snug text-ink transition-colors group-hover:text-cyan">
            {name}
          </h3>
        </Link>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-ink-dim">
              {t("listedPrice")}
            </p>
            {priceLabel ? (
              <p className="text-heading-sm font-bold tabular-nums text-ink">
                {priceLabel}
              </p>
            ) : (
              <p className="text-body font-semibold text-ink-muted">
                {tCommon("contactForPricing")}
              </p>
            )}
          </div>
        </div>

        {/* MOQ and lead time are omitted rather than estimated: they used to be
            generated per product from the product id. */}
        <dl className="mt-4 flex flex-1 flex-col gap-2 border-t border-line pt-4 text-caption text-ink-muted">
          {moq && (
            <div className="flex items-center justify-between gap-2">
              <dt>{t("moqLabel")}</dt>
              <dd className="font-semibold tabular-nums text-ink">{moq}</dd>
            </div>
          )}
          {shippingTime && (
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-ink-dim" aria-hidden />
                {t("shippingTime")}
              </dt>
              <dd className="font-semibold text-ink">{shippingTime}</dd>
            </div>
          )}
          {supplierName && (
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-ink-dim" aria-hidden />
                {tCommon("supplier")}
              </dt>
              <dd className="min-w-0 truncate font-semibold text-ink" title={supplierName}>
                {supplierName}
              </dd>
            </div>
          )}
        </dl>

        <Link
          href={href}
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-body-sm font-semibold text-ink transition-all duration-200 ease-cinema hover:border-cyan/40 hover:bg-cyan-soft hover:text-cyan cursor-pointer"
        >
          <GitCompare className="h-4 w-4" aria-hidden />
          {t("compareProducts")}
        </Link>
      </div>
    </article>
  );
}
