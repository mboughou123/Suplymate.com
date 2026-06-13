import Link from "next/link";
import { MapPin, Package, Truck, ShieldCheck } from "lucide-react";
import type { Supplier } from "@/data/suppliers";

type SupplierCardProps = {
  supplier: Supplier;
};

function ReliabilityBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-emerald-50 text-emerald-700"
      : score >= 85
        ? "bg-mustard/15 text-amber-800"
        : "bg-slate-100 text-ink-muted";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      {score}%
    </span>
  );
}

export default function SupplierCard({ supplier }: SupplierCardProps) {
  return (
    <article className="glass-card glass-hover flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{supplier.name}</h3>
          <p className="mt-1 text-sm text-ink-dim">{supplier.industry}</p>
        </div>
        <ReliabilityBadge score={supplier.reliabilityScore} />
      </div>

      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
          <dd className="text-ink-muted">{supplier.location}</dd>
        </div>
        <div className="flex gap-2">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
          <dd className="text-ink-muted">
            {supplier.products.slice(0, 2).join(" · ")}
            {supplier.products.length > 2 && " …"}
          </dd>
        </div>
        <div className="flex gap-2">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
          <dd className="text-ink-muted">{supplier.deliveryRegions.join(", ")}</dd>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <dt className="text-ink-dim">MOQ:</dt>
          <dd className="font-medium text-ink">{supplier.moq}</dd>
        </div>
      </dl>

      <Link
        href={`/suppliers#${supplier.id}`}
        className="btn-secondary mt-6 w-full"
      >
        View supplier
      </Link>
    </article>
  );
}
