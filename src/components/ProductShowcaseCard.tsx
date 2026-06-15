"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Truck, Users, GitCompare, type LucideIcon } from "lucide-react";

export type ProductShowcaseCardProps = {
  name: string;
  icon: LucideIcon;
  /** Inline CSS gradient for the product image tile */
  tileGradient: string;
  priceRange: string;
  shippingTime: string;
  supplierCount: number;
  href?: string;
};

export default function ProductShowcaseCard({
  name,
  icon: Icon,
  tileGradient,
  priceRange,
  shippingTime,
  supplierCount,
  href = "/products",
}: ProductShowcaseCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-[border-color,box-shadow] duration-300 ease-cinema hover:border-cyan/40 hover:shadow-cardHover"
      whileHover={reduceMotion ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
    >
      {/* Product image tile */}
      <div
        className="relative flex h-28 items-center justify-center overflow-hidden"
        style={{ backgroundImage: tileGradient }}
      >
        <div className="absolute inset-0 ai-grid-bg opacity-40" />
        <motion.span
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/85 text-cyan shadow-glow backdrop-blur"
          whileHover={reduceMotion ? undefined : { scale: 1.1, rotate: -3 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
        >
          <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden />
        </motion.span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-ink">{name}</h3>
        <p className="mt-1 text-sm font-bold text-cyan">{priceRange}</p>

        <div className="mt-3 flex flex-1 flex-col gap-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-teal" aria-hidden />
            {shippingTime}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-teal" aria-hidden />
            {supplierCount}+ suppliers
          </span>
        </div>

        <Link
          href={href}
          className="group/btn mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink transition-all duration-300 ease-cinema hover:border-cyan/50 hover:bg-cyan/5 hover:text-cyan"
        >
          <GitCompare className="h-4 w-4" aria-hidden />
          Compare Suppliers
        </Link>
      </div>
    </motion.article>
  );
}
