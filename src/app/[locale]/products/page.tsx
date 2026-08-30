import { getTranslations } from "next-intl/server";
import { getPublicProductsPage } from "@/lib/public-products";
import ListingPageHero from "@/components/ListingPageHero";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const t = await getTranslations("products");
  const initial = await getPublicProductsPage({ page: 1, pageSize: 24 });

  const categoryCount = initial.facets.categories.length;

  return (
    <div className="min-h-screen bg-transparent">
      <ListingPageHero
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-glow backdrop-blur-sm">
            {t("badge")}
          </span>
        }
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        stats={[
          { value: initial.total, label: t("productsListed") },
          { value: categoryCount, label: t("categoriesCount") },
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProductsClient
          initialItems={initial.items}
          initialTotal={initial.total}
          initialHasMore={initial.hasMore}
          pageSize={initial.pageSize}
          facets={initial.facets}
        />
      </div>
    </div>
  );
}
