import { getTranslations } from "next-intl/server";
import { getPublicProductsPage } from "@/lib/public-products";
import ProductsClient from "../ProductsClient";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: "/products",
    titleKey: "productsTitle",
    descriptionKey: "productsDescription",
  });
}

export default async function ProductsPage() {
  const t = await getTranslations("products");
  const initial = await getPublicProductsPage({ page: 1, pageSize: 24 });

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
