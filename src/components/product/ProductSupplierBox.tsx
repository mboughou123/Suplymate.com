import Link from "next/link";
import { BadgeCheck, Star, ArrowUpRight } from "lucide-react";
import type { ProductSupplierCard } from "@/lib/product-detail";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";

export default function ProductSupplierBox({
  supplier,
}: {
  supplier: ProductSupplierCard;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
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
            {supplier.rating !== null && (
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <Star
                  className="h-4 w-4 fill-mustard text-mustard"
                  aria-hidden
                />
                {supplier.rating.toFixed(1)}
                {supplier.reviewCount !== null && (
                  <span className="font-normal text-ink-dim">
                    ({supplier.reviewCount.toLocaleString()} Google)
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The response-time, on-time-delivery and reorder-rate tiles that sat
          here were generated per supplier and measured nothing. */}

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
