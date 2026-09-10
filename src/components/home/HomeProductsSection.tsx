import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/data/products";
import {
  homeCategoryKey,
  homeProductCategories,
  pickHomeProducts,
} from "@/lib/home-products";
import HomeProductsGrid from "./HomeProductsGrid";

/**
 * Homepage "Products" band: a photo-first grid of real catalogue SKUs from the
 * curated media packs (2 columns on mobile → 4 on desktop), with client-side
 * category chips and a CTA into the full catalogue.
 *
 * Receives the same cached `getProductsFromDb()` list the page already holds
 * — no extra round-trip. Renders nothing when no product has a real photo, so
 * the homepage never shows a grid of category tiles.
 */
export default async function HomeProductsSection({ products }: { products: Product[] }) {
  const t = await getTranslations("homeProducts");
  const items = pickHomeProducts(products);
  if (items.length === 0) return null;

  const categories = homeProductCategories(items);
  const labels: Record<string, string> = { all: t("all") };
  for (const c of categories) {
    const key = homeCategoryKey(c);
    labels[c] = t.has(`categories.${key}`) ? t(`categories.${key}`) : c;
  }

  return (
    <section
      id="products"
      className="border-b border-slate-100/80 bg-white section-y-tight scroll-mt-28"
      aria-labelledby="home-products-heading"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-cyan">{t("eyebrow")}</p>
          <h2
            id="home-products-heading"
            className="mt-3 font-display text-display text-ink text-balance"
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">{t("subtitle")}</p>
        </div>

        <HomeProductsGrid
          items={items}
          categories={categories}
          labels={labels}
          viewLabel={t("viewProduct")}
          emptyLabel={t("empty")}
          filterLabel={t("filterLabel")}
        />

        <div className="mt-block text-center">
          <Link href="/products" className="btn-secondary px-6 py-3 text-sm">
            {t("browseAll")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
