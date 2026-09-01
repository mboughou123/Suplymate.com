import { getTranslations } from "next-intl/server";
import { getPublicProductsPage } from "@/lib/public-products";
import ListingPageHeader from "@/components/listing/ListingPageHeader";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const t = await getTranslations("products");
  const initial = await getPublicProductsPage({ page: 1, pageSize: 24 });

  return (
    <div className="min-h-screen bg-base">
      <ListingPageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />

      <div className="container-page py-10 sm:py-12">
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
