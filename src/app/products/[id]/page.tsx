import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getComparisonByProductId,
  getDefaultComparison,
} from "@/data/comparisons";
import { getProductById } from "@/data/products";
import SupplierComparisonTable from "@/components/SupplierComparisonTable";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductComparisonPage({ params }: Props) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const comparison =
    getComparisonByProductId(id) ??
    getDefaultComparison(id, product.name);

  return (
    <div className="bg-transparent min-h-screen">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/products"
            className="text-sm font-medium text-cyan hover:text-teal"
          >
            ← Back to products
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold text-ink">
            {comparison.productName}
          </h1>
          <p className="mt-3 max-w-3xl text-ink-muted leading-relaxed">
            {comparison.summary}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Best price
            </p>
            <p className="mt-2 font-semibold text-ink">
              {comparison.bestPrice.supplierName}
            </p>
            <p className="mt-1 text-lg font-bold text-ink">
              {comparison.bestPrice.currency}{" "}
              {comparison.bestPrice.price.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Fastest delivery
            </p>
            <p className="mt-2 font-semibold text-ink">
              {comparison.fastestDelivery.supplierName}
            </p>
            <p className="mt-1 text-lg font-bold text-ink">
              {comparison.fastestDelivery.days} days
            </p>
          </div>
          <div className="rounded-2xl border border-mustard/30 bg-mustard/15/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Best overall
            </p>
            <p className="mt-2 font-semibold text-ink">
              {comparison.bestOverall.supplierName}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {comparison.bestOverall.reason}
            </p>
          </div>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-ink">
          Supplier comparison
        </h2>
        <div className="mt-4">
          <SupplierComparisonTable offers={comparison.offers} />
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/ai-assistant"
            className="rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-mid"
          >
            Ask AI for advice
          </Link>
          <Link
            href="/price-charts"
            className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-ink hover:border-cyan"
          >
            View material prices
          </Link>
        </div>
      </div>
    </div>
  );
}
