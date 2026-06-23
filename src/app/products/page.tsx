import { getPublicProductsPage } from "@/lib/public-products";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const initial = await getPublicProductsPage({ page: 1, pageSize: 24 });

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Products</h1>
          <p className="mt-3 max-w-2xl text-white/75">
            Browse {initial.total.toLocaleString()} industrial products from verified and
            listed suppliers. Search and filter by category, supplier, country and price.
          </p>
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
