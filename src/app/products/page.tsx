import { getProductsFromDb } from "@/lib/data-service";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  const products = await getProductsFromDb();

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
        <ProductsClient initialProducts={products} />
      </div>
    </div>
  );
}
