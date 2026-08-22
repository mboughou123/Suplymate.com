"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Package, Search } from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import ImageWithFallback from "@/components/ImageWithFallback";
import { SectionHeading, reveal } from "./primitives";
import ProfileActionButton from "./ProfileActionButton";

/**
 * Products this supplier is recorded as offering.
 *
 * Each card previously carried a price range, MOQ, lead time, material,
 * certifications, a star rating and an "AI pick" badge, all generated per
 * product from a seeded RNG. Sorting by price and rating sorted invented
 * numbers. Only the product name and photo have a real source, so the card now
 * shows those and routes the buyer to a quote request for anything else.
 */
export default function ProductsSection({
  profile,
}: {
  profile: SupplierProfile;
}) {
  const t = useTranslations("supplierProfile");
  const { products, base } = profile;
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  if (products.length === 0) {
    return (
      <motion.section
        {...reveal}
        transition={{ duration: 0.6 }}
        className="py-8 sm:py-10"
      >
        <SectionHeading
          eyebrow={t("catalogEyebrow")}
          title={t("productsTitle")}
          description={t("productsDescription")}
          icon={<Package className="h-5 w-5" />}
        />
        <p className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-ink-dim">
          {t("noProductsRecorded")}
        </p>
      </motion.section>
    );
  }

  return (
    <motion.section
      {...reveal}
      transition={{ duration: 0.6 }}
      className="py-8 sm:py-10"
    >
      <SectionHeading
        eyebrow={t("catalogEyebrow")}
        title={t("productsTitle")}
        description={t("productsDescription")}
        icon={<Package className="h-5 w-5" />}
      />

      {products.length > 4 && (
        <div className="relative mb-5 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
            aria-hidden
          />
          <label htmlFor="product-search" className="sr-only">
            {t("searchProductsPlaceholder")}
          </label>
          <input
            id="product-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchProductsPlaceholder")}
            className="w-full rounded-xl border border-line py-2.5 pl-10 pr-3 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30"
          />
        </div>
      )}

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
            <div
              className="relative flex h-36 items-center justify-center overflow-hidden"
              style={{ backgroundImage: p.gradient }}
            >
              <ImageWithFallback
                src={p.hasRealPhoto ? p.image : undefined}
                fallbackSrc={p.imageFallback}
                alt={p.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <p className="text-sm font-bold leading-tight text-ink">{p.name}</p>
              <p className="text-xs text-ink-dim">{t("pricingOnRequest")}</p>
              <ProfileActionButton
                supplierId={base.id}
                supplierName={base.name}
                intent="quote"
                label={t("requestQuote")}
                productName={p.name}
                className="btn-secondary mt-auto w-full justify-center !py-2 text-xs"
              />
            </div>
          </motion.article>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-ink-dim">
          {t("noProductsMatch")}
        </p>
      )}
    </motion.section>
  );
}
