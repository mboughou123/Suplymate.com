import { getTranslations } from "next-intl/server";
import { getPublicProductsPage } from "@/lib/public-products";
import { applyCatalogueCap } from "@/lib/catalogue-access";
import { entitlementsForSession } from "@/lib/plan-access";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const t = await getTranslations("products");
  const { entitlements } = await entitlementsForSession();
  const pageSize = entitlements.catalogueProductLimit ?? 24;
  const initial = await getPublicProductsPage({ page: 1, pageSize });
  const capped = applyCatalogueCap(
    initial.items,
    initial.total,
    1,
    pageSize,
    entitlements.catalogueProductLimit,
  );

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
          initialItems={capped.items}
          initialTotal={capped.total}
          initialHasMore={capped.hasMore}
          pageSize={pageSize}
          facets={initial.facets}
          visibleLimit={capped.visibleLimit}
          lockedCount={capped.lockedCount}
          canContact={entitlements.supplierMessaging}
        />
      </div>
    </div>
  );
}
