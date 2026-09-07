"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import {
  Package,
  Search,
  Sparkles,
  Truck,
  Clock,
  Layers,
  Star,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import ImageWithFallback from "@/components/ImageWithFallback";
import { SectionHeading, reveal } from "./primitives";
import ProfileActionButton from "./ProfileActionButton";

type SortKey = "recommended" | "price-low" | "rating" | "name";

const ALL_CATEGORY = "__all__";

export default function ProductsSection({ profile }: { profile: SupplierProfile }) {
  const t = useTranslations("supplierProfile");
  const common = useTranslations("common");
  const { products, base } = profile;
  // Real catalogue SKUs carry no invented rating / "AI pick" flags, so the
  // sort options and badges that depend on them are hidden.
  const isReal = products.some((p) => p.isReal);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [sort, setSort] = useState<SortKey>(isReal ? "name" : "recommended");

  const categories = useMemo(
    () => [ALL_CATEGORY, ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const visible = useMemo(() => {
    let list = products.filter(
      (p) =>
        (category === ALL_CATEGORY || p.category === category) &&
        (query === "" ||
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.material.toLowerCase().includes(query.toLowerCase()))
    );
    if (sort === "price-low") {
      list = [...list].sort((a, b) => priceVal(a.priceRange) - priceVal(b.priceRange));
    } else if (sort === "rating") {
      list = [...list].sort((a, b) => b.rating - a.rating);
    } else if (sort === "name") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list = [...list].sort((a, b) => Number(b.aiRecommended) - Number(a.aiRecommended));
    }
    return list;
  }, [products, query, category, sort]);

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <SectionHeading
        eyebrow={t("catalogEyebrow")}
        title={t("productsPricingTitle")}
        description={isReal ? t("listedCatalogueDescription") : t("productsPricingDescription")}
        icon={<Package className="h-5 w-5" />}
      />

      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchProductsPlaceholder")}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30"
        >
          {isReal ? (
            <>
              <option value="name">{t("sortName")}</option>
              <option value="price-low">{t("sortPriceLow")}</option>
            </>
          ) : (
            <>
              <option value="recommended">{t("sortAiRecommended")}</option>
              <option value="price-low">{t("sortPriceLow")}</option>
              <option value="rating">{t("sortTopRated")}</option>
            </>
          )}
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
            {c === ALL_CATEGORY ? common("all") : c}
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
            <div className="relative flex h-36 items-center justify-center overflow-hidden" style={{ backgroundImage: p.gradient }}>
              {p.href ? (
                <Link href={p.href} className="absolute inset-0" aria-label={p.name}>
                  <ImageWithFallback
                    src={p.hasRealPhoto ? p.image : undefined}
                    fallbackSrc={p.imageFallback}
                    alt={p.name}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-105"
                  />
                </Link>
              ) : (
                <ImageWithFallback
                  src={p.hasRealPhoto ? p.image : undefined}
                  fallbackSrc={p.imageFallback}
                  alt={p.name}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {p.aiRecommended && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-cyan shadow-sm">
                  <Sparkles className="h-3 w-3" aria-hidden /> {t("aiPick")}
                </span>
              )}
              {p.rating > 0 && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-ink">
                  <Star className="h-3 w-3 fill-mustard text-mustard" aria-hidden /> {p.rating}
                </span>
              )}
              {p.isReal && (
                <span className="absolute left-3 top-3 rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  {p.category}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <p className="text-sm font-bold leading-tight text-ink">
                  {p.href ? (
                    <Link href={p.href} className="hover:text-cyan">
                      {p.name}
                    </Link>
                  ) : (
                    p.name
                  )}
                </p>
                <p className="mt-0.5 text-base font-extrabold text-cyan">{p.priceRange}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <Spec icon={Layers} label={t("moq")} value={p.moq} />
                <Spec icon={Clock} label={t("leadTime")} value={p.leadTime} />
                <Spec icon={Package} label={t("material")} value={p.material} />
                <Spec icon={Truck} label={t("shipping")} value={p.shipping} />
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
              <div className="mt-auto flex gap-2">
                {p.href && (
                  <Link
                    href={p.href}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-cyan/50 hover:text-cyan"
                  >
                    {t("viewProduct")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
                <ProfileActionButton
                  supplierId={base.id}
                  supplierName={base.name}
                  intent="quote"
                  label={t("requestQuote")}
                  productName={p.name}
                  className="btn-secondary flex-1 justify-center !py-2 text-xs"
                />
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-ink-dim">
          {t("noProductsMatch")}
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
