import { getProductsFromDb } from "@/lib/data-service";
import { getProductCardData, productCatalogueRank } from "@/lib/product-detail";
import ProductsClient, { type CatalogueItem } from "./ProductsClient";

export default async function ProductsPage() {
  const products = await getProductsFromDb();

  // Build cards server-side (keeps the supplier dataset out of the client
  // bundle) and sort by priority tier: verified + website + supplier photos +
  // real product photos rank highest; fallback-only products rank lower. Every
  // catalogue product is kept (each resolves to at least a strong category
  // fallback) so the catalogue is never regressed to empty.
  const items: CatalogueItem[] = products
    .map((product) => ({ product, card: getProductCardData(product) }))
    .sort((a, b) => {
      const diff = productCatalogueRank(b.card) - productCatalogueRank(a.card);
      return diff !== 0 ? diff : a.product.name.localeCompare(b.product.name);
    });

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Products</h1>
          <p className="mt-3 max-w-2xl text-white/75">
            What can I buy and compare? Search industrial products and filter by category and price.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProductsClient initialItems={items} />
      </div>
    </div>
  );
}
