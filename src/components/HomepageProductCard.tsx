"use client";

import Link from "next/link";
import { Truck, Users, GitCompare, BadgeCheck } from "lucide-react";
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
  startingPriceLabel: string;
  moq: string;
  shippingTime: string;
  supplierCount: number;
  verified: boolean;
  href: string;
};

export default function HomepageProductCard({
  name,
  category,
  image,
  imageFallback,
  startingPriceLabel,
  moq,
  shippingTime,
  supplierCount,
  verified,
  href,
}: HomepageProductCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-all duration-300 ease-cinema hover:-translate-y-1 hover:border-slate-300 hover:shadow-cardHover motion-reduce:transform-none">
      {/* Product photo — consistent 4:3 */}
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-slate-100 cursor-pointer">
        <ImageWithFallback
          src={image}
          fallbackSrc={imageFallback}
          placeholderSrc={GENERIC_PRODUCT_PLACEHOLDER}
          alt={name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="h-full w-full object-cover transition-transform duration-500 ease-cinema group-hover:scale-[1.04] motion-reduce:transform-none"
        />
        {verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 py-1 pl-1.5 pr-2.5 text-caption font-semibold text-up shadow-sm ring-1 ring-black/5 backdrop-blur">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Verified
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-navy-dark/60 px-2.5 py-1 text-caption font-medium text-white backdrop-blur">
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
              Starting at
            </p>
            <p className="text-heading-sm font-bold tabular-nums text-ink">
              {startingPriceLabel}
            </p>
          </div>
        </div>

        <dl className="mt-4 flex flex-1 flex-col gap-2 border-t border-slate-100 pt-4 text-caption text-ink-muted">
          <div className="flex items-center justify-between gap-2">
            <dt>MOQ</dt>
            <dd className="font-semibold tabular-nums text-ink">{moq}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-ink-dim" aria-hidden />
              Delivery
            </dt>
            <dd className="font-semibold text-ink">{shippingTime}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-ink-dim" aria-hidden />
              Suppliers
            </dt>
            <dd className="font-semibold tabular-nums text-ink">{supplierCount}+</dd>
          </div>
        </dl>

        <Link
          href={href}
          className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm font-semibold text-ink transition-all duration-200 ease-cinema hover:border-cyan/40 hover:bg-cyan-soft hover:text-cyan cursor-pointer"
        >
          <GitCompare className="h-4 w-4" aria-hidden />
          Compare Suppliers
        </Link>
      </div>
    </article>
  );
}
