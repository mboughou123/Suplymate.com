"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { HOME_PRODUCTS_VISIBLE, type HomeProductItem } from "@/lib/home-products";

const ALL = "all";

type Props = {
  items: HomeProductItem[];
  categories: string[];
  /** Translated chip labels keyed by category (plus `all`). */
  labels: Record<string, string>;
  viewLabel: string;
  emptyLabel: string;
  filterLabel: string;
};

export default function HomeProductsGrid({
  items,
  categories,
  labels,
  viewLabel,
  emptyLabel,
  filterLabel,
}: Props) {
  const [active, setActive] = useState<string>(ALL);

  const visible = useMemo(() => {
    if (active === ALL) return items.slice(0, HOME_PRODUCTS_VISIBLE);
    return items.filter((i) => i.category === active);
  }, [items, active]);

  return (
    <>
      {categories.length > 1 && (
        <div
          role="group"
          aria-label={filterLabel}
          className="mt-block flex flex-wrap justify-center gap-2"
        >
          {[ALL, ...categories].map((cat) => {
            const selected = cat === active;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActive(cat)}
                aria-pressed={selected}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-navy text-white shadow-card"
                    : "border border-slate-200 bg-white text-ink-muted hover:border-cyan/40 hover:text-cyan"
                }`}
              >
                {labels[cat] ?? cat}
              </button>
            );
          })}
        </div>
      )}

      {visible.length > 0 ? (
        <ul className={`${categories.length > 1 ? "mt-8" : "mt-block-lg"} grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4`}>
          {visible.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/products/${p.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-[border-color,box-shadow,transform] duration-300 ease-cinema hover:-translate-y-1 hover:border-cyan/40 hover:shadow-cardHover"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <Image
                    src={p.image}
                    alt={`${p.name} — ${p.supplierName}`}
                    fill
                    loading={i < 4 ? "eager" : "lazy"}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition duration-500 ease-cinema group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-navy shadow-sm backdrop-blur">
                    {labels[p.category] ?? p.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {/* `text-base` is a COLOUR in this theme (bg-base), so the desktop size is spelled out. */}
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-cyan sm:text-[1rem]">
                    {p.name}
                  </h3>
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-muted">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
                    <span className="line-clamp-2">
                      {p.supplierName}
                      {p.supplierCountry ? (
                        <span className="text-ink-dim"> · {p.supplierCountry}</span>
                      ) : null}
                    </span>
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-cyan transition-all group-hover:gap-2.5">
                    {viewLabel}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-ink-dim">
          {emptyLabel}
        </p>
      )}
    </>
  );
}
