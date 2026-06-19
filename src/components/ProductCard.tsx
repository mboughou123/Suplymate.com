"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Star, MapPin, Truck, ArrowRight } from "lucide-react";
import type { Product } from "@/data/products";
import { getProductCardData } from "@/lib/product-detail";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";
import ImageWithFallback from "@/components/ImageWithFallback";
import { getProductFallbackImage } from "@/lib/image-fallback";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const reduceMotion = useReducedMotion();
  const d = getProductCardData(product);

  return (
    <motion.article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-[border-color,box-shadow] duration-300 ease-cinema hover:border-cyan/40 hover:shadow-cardHover"
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
    >
      {/* Product photo */}
      <Link href={`/products/${d.id}`} className="relative block">
        <div
          className="relative flex h-44 items-center justify-center overflow-hidden"
          style={{ backgroundImage: d.gradient }}
        >
          <ImageWithFallback
            src={d.imageUrl}
            fallbackSrc={getProductFallbackImage(d.name, d.category)}
            alt={d.name}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-cinema group-hover:scale-105"
          />
          {d.verified && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              Verified
            </span>
          )}
          <span className="absolute right-3 top-3 rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            {d.category}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link href={`/products/${d.id}`}>
          <h3 className="line-clamp-2 text-base font-semibold text-ink transition-colors group-hover:text-cyan">
            {d.name}
          </h3>
        </Link>

        {/* Supplier + rating */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-cyan" aria-hidden />
            {d.supplierName}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Star className="h-3 w-3 fill-mustard text-mustard" aria-hidden />
            {d.rating.toFixed(1)}
            <span className="font-normal text-ink-dim">({d.reviewCount})</span>
          </span>
        </div>

        {/* Bulk price */}
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-dim">
            Bulk price
          </p>
          <p className="text-lg font-bold text-cyan">{d.bulkPriceLabel}</p>
        </div>

        {/* MOQ + shipping */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span>
            MOQ: <span className="font-semibold text-ink">{d.moq}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Truck className="h-3.5 w-3.5 text-teal" aria-hidden />
            {d.shippingTime}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2 pt-1">
          <Link
            href={`/products/${d.id}`}
            className="group/btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink transition-all duration-300 ease-cinema hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan"
          >
            View Product
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <ContactSupplierButton
            supplierId={d.supplierId}
            supplierName={d.supplierName}
            label="Request Quote"
            productName={d.name}
            className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm"
          />
        </div>
      </div>
    </motion.article>
  );
}
