import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicProductsPage } from "@/lib/public-products";
import { PRODUCT_LIST_PAGE_SIZE } from "@/lib/products-query";
import ProductsClient from "./ProductsClient";

// force-static + setRequestLocale: getTranslations() without a locale from
// params opted this page into dynamic rendering, so Vercel served
// Cache-Control: private, no-store (TTFB ~1.8s, x-vercel-cache MISS).
export const dynamic = "force-static";
export const revalidate = 300;

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("products");
  const initial = await getPublicProductsPage({ page: 1, pageSize: PRODUCT_LIST_PAGE_SIZE });

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{t("pageTitle")}</h1>
          <p className="mt-3 max-w-2xl text-white/75">{t("pageSubtitle")}</p>
        </div>
      </div>

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
