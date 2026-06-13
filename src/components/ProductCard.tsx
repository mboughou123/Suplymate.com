import Link from "next/link";
import { Clock, Users, Tag } from "lucide-react";
import type { Product } from "@/data/products";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="glass-card glass-hover flex flex-col p-6">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink-muted">
        <Tag className="h-3 w-3" aria-hidden />
        {product.category}
      </span>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-ink">
        {product.name}
      </h3>
      <div className="mt-4 space-y-2 text-sm">
        <p>
          <span className="text-ink-dim">Price range: </span>
          <span className="font-semibold text-ink">
            {product.currency} {product.priceMin.toLocaleString()} –{" "}
            {product.priceMax.toLocaleString()}
          </span>
          <span className="text-ink-dim"> / {product.unit}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-ink-dim" aria-hidden />
          <span className="text-ink-dim">Best delivery:</span>
          <span className="font-medium text-ink">{product.bestDeliveryDays} days</span>
        </p>
        <p className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-ink-dim" aria-hidden />
          <span className="text-ink-dim">Suppliers:</span>
          <span className="font-medium text-ink">{product.supplierCount}</span>
        </p>
      </div>
      <Link href={`/products/${product.id}`} className="btn-primary mt-6 w-full">
        Compare offers
      </Link>
    </article>
  );
}
