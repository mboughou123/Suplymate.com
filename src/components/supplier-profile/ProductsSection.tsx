"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Search,
  Sparkles,
  Truck,
  Clock,
  Layers,
  Star,
  ShieldCheck,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, reveal } from "./primitives";
import ProfileActionButton from "./ProfileActionButton";

type SortKey = "recommended" | "price-low" | "rating";

export default function ProductsSection({ profile }: { profile: SupplierProfile }) {
  const { products, base } = profile;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("recommended");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const visible = useMemo(() => {
    let list = products.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (query === "" ||
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.material.toLowerCase().includes(query.toLowerCase()))
    );
    if (sort === "price-low") {
      list = [...list].sort((a, b) => priceVal(a.priceRange) - priceVal(b.priceRange));
    } else if (sort === "rating") {
      list = [...list].sort((a, b) => b.rating - a.rating);
    } else {
      list = [...list].sort((a, b) => Number(b.aiRecommended) - Number(a.aiRecommended));
    }
    return list;
  }, [products, query, category, sort]);

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Catalog"
        title="Products & pricing"
        description="Search, filter and compare this supplier's catalog with live MOQ and lead times."
        icon={<Package className="h-5 w-5" />}
      />

      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or materials…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30"
        >
          <option value="recommended">AI recommended</option>
          <option value="price-low">Price: low to high</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              category === c
                ? "bg-cyan text-white shadow-glow"
                : "border border-slate-200 bg-white text-ink-muted hover:border-cyan/40"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 6) * 0.05, duration: 0.45 }}
            className="glass-card glass-hover flex flex-col overflow-hidden p-0"
          >
            <div className="relative flex h-36 items-center justify-center" style={{ backgroundImage: p.gradient }}>
              <Package className="h-10 w-10 text-cyan/70" aria-hidden />
              {p.aiRecommended && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-cyan shadow-sm">
                  <Sparkles className="h-3 w-3" aria-hidden /> AI pick
                </span>
              )}
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-ink">
                <Star className="h-3 w-3 fill-mustard text-mustard" aria-hidden /> {p.rating}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <p className="text-sm font-bold leading-tight text-ink">{p.name}</p>
                <p className="mt-0.5 text-base font-extrabold text-cyan">{p.priceRange}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <Spec icon={Layers} label="MOQ" value={p.moq} />
                <Spec icon={Clock} label="Lead time" value={p.leadTime} />
                <Spec icon={Package} label="Material" value={p.material} />
                <Spec icon={Truck} label="Shipping" value={p.shipping} />
              </dl>
              <div className="flex flex-wrap gap-1.5">
                {p.certifications.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted"
                  >
                    <ShieldCheck className="h-3 w-3 text-emerald-600" aria-hidden /> {c}
                  </span>
                ))}
              </div>
              <ProfileActionButton
                supplierId={base.id}
                supplierName={base.name}
                intent="quote"
                label="Request quote"
                productName={p.name}
                className="btn-secondary mt-auto w-full justify-center !py-2 text-xs"
              />
            </div>
          </motion.article>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-ink-dim">
          No products match your search.
        </p>
      )}
    </motion.section>
  );
}

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-ink-dim" aria-hidden />
      <span className="text-ink-dim">{label}:</span>
      <span className="truncate font-semibold text-ink" title={value}>
        {value}
      </span>
    </div>
  );
}

function priceVal(range: string): number {
  const m = range.replace(/[^0-9.\-– ]/g, "").split(/[–\-]/)[0];
  return Number(m.replace(/[^0-9.]/g, "")) || 0;
}
