"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RecommendedProduct } from "@/lib/product-detail";
import { PRODUCT_ICONS } from "@/components/product/productIcons";

export default function RecommendedProducts({
  products,
}: {
  products: RecommendedProduct[];
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
      {products.map((p) => {
        const Icon = PRODUCT_ICONS[p.icon];
        return (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="group flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-all duration-300 ease-cinema hover:-translate-y-1 hover:border-cyan/40 hover:shadow-cardHover"
          >
            <div
              className="relative flex h-32 items-center justify-center"
              style={{ backgroundImage: p.gradient }}
            >
              <div className="absolute inset-0 ai-grid-bg opacity-30" />
              <Icon className="relative h-10 w-10 text-white/90" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan">
                {p.category}
              </span>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink group-hover:text-cyan">
                {p.name}
              </p>
              <p className="mt-2 text-sm font-bold text-ink">{p.priceFromLabel}</p>
              <p className="text-[11px] text-ink-dim">MOQ: {p.moq}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan">
                View product
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
