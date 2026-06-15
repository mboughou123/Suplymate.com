import Link from "next/link";
import { BadgeCheck, Star, MapPin, Clock, Truck, Repeat, ArrowUpRight } from "lucide-react";
import type { ProductSupplierCard } from "@/lib/product-detail";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";

export default function ProductSupplierBox({
  supplier,
}: {
  supplier: ProductSupplierCard;
}) {
  const metrics = [
    { icon: Clock, label: "Response", value: supplier.responseTime },
    { icon: Truck, label: "On-time", value: `${supplier.onTimeDelivery}%` },
    { icon: Repeat, label: "Reorder rate", value: `${supplier.reorderRate}%` },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="flex items-start gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-card"
          style={{ backgroundImage: supplier.logoGradient }}
        >
          {supplier.logoText}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={supplier.href}
              className="truncate text-lg font-bold text-ink hover:text-cyan"
            >
              {supplier.name}
            </Link>
            {supplier.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>{supplier.flag}</span>
              {supplier.city}, {supplier.country}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Star className="h-4 w-4 fill-mustard text-mustard" aria-hidden />
              {supplier.rating.toFixed(1)}
              <span className="font-normal text-ink-dim">
                ({supplier.reviewCount.toLocaleString()})
              </span>
            </span>
            <span className="text-ink-dim">{supplier.yearsInBusiness} yrs in business</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-slate-50 p-3 text-center">
            <m.icon className="mx-auto h-4 w-4 text-cyan" aria-hidden />
            <p className="mt-1 text-sm font-bold text-ink">{m.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-dim">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <ContactSupplierButton
          supplierId={supplier.id}
          supplierName={supplier.name}
          label="Contact Supplier"
          className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5"
        />
        <Link
          href={supplier.href}
          className="btn-secondary inline-flex flex-1 items-center justify-center gap-1.5"
        >
          View Profile
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
