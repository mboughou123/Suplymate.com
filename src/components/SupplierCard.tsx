import Link from "next/link";
import {
  BadgeCheck,
  Star,
  MapPin,
  Clock,
  Truck,
  RotateCcw,
  Package,
  Users,
  Building2,
} from "lucide-react";
import type { Supplier } from "@/data/suppliers";
import { toDisplaySupplier } from "@/lib/supplier-display";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";
import FavoriteButton from "@/components/chat/FavoriteButton";

type SupplierCardProps = {
  supplier: Supplier;
};

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-slate-50 px-2 py-2.5 text-center">
      <Icon className="mb-1 h-4 w-4 text-cyan" aria-hidden />
      <span className="text-sm font-bold text-ink">{value}</span>
      <span className="text-[10px] leading-tight text-ink-dim">{label}</span>
    </div>
  );
}

export default function SupplierCard({ supplier }: SupplierCardProps) {
  const s = toDisplaySupplier(supplier);

  return (
    <article className="glass-card glass-hover flex flex-col overflow-hidden p-0">
      {/* Banner + logo + company image */}
      <div
        className="relative h-24"
        style={{ backgroundImage: s.bannerGradient }}
      >
        {s.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.imageUrl}
            alt={`${s.name} facility`}
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
        )}
        {s.verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Verified
          </span>
        )}
        <FavoriteButton
          supplierId={s.id}
          supplierName={s.name}
          className="absolute left-[5.5rem] top-3"
        />
        <div
          className="absolute -bottom-7 left-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl text-xl font-extrabold text-white shadow-cardHover ring-4 ring-white"
          style={{ backgroundImage: s.logoGradient }}
        >
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logoUrl} alt={s.name} className="h-full w-full object-cover" />
          ) : (
            s.logoText
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-9">
        {/* Identity */}
        <div>
          <h3 className="text-base font-bold leading-tight text-ink">{s.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <span aria-hidden>{s.flag}</span>
              {s.country}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Star className="h-3.5 w-3.5 fill-mustard text-mustard" aria-hidden />
              {s.rating.toFixed(1)}/5
            </span>
            <span className="text-ink-dim">({s.reviewCount} reviews)</span>
          </div>

          {/* Tags */}
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-md bg-cyan/10 px-2 py-0.5 font-semibold text-cyan">
              {s.industry}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-ink-muted">
              <Building2 className="h-3 w-3" aria-hidden />
              {s.yearsInBusiness} yrs
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-ink-muted">
              <Users className="h-3 w-3" aria-hidden />
              {s.employees} staff
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-ink-muted">
              <MapPin className="h-3 w-3" aria-hidden />
              {s.location}
            </span>
          </div>
        </div>

        {/* Marketplace metrics */}
        <div className="grid grid-cols-3 gap-2">
          <Metric
            icon={Truck}
            value={`${s.onTimeDelivery}%`}
            label="On-time delivery"
          />
          <Metric icon={Clock} value={s.responseTime} label="Response time" />
          <Metric
            icon={RotateCcw}
            value={`${s.reorderRate}%`}
            label="Reorder rate"
          />
        </div>

        {/* Featured products */}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-dim">
            Featured products
          </p>
          <div className="grid grid-cols-3 gap-2">
            {s.products.map((p, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 p-1.5"
              >
                <div
                  className="mb-1.5 flex h-14 items-center justify-center rounded-md"
                  style={{ backgroundImage: p.gradient }}
                >
                  <Package className="h-5 w-5 text-cyan" aria-hidden />
                </div>
                <p className="truncate text-[11px] font-semibold text-ink" title={p.name}>
                  {p.name}
                </p>
                <p className="text-[11px] font-bold text-cyan">{p.price}</p>
                <p className="text-[10px] text-ink-dim">MOQ {p.moq}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-1">
          <Link
            href={`/suppliers#${s.id}`}
            className="btn-secondary flex-1 justify-center"
          >
            View details
          </Link>
          <ContactSupplierButton
            supplierId={s.id}
            supplierName={s.name}
            label="Contact supplier"
            className="btn-primary inline-flex flex-1 items-center justify-center gap-1.5"
          />
        </div>
      </div>
    </article>
  );
}
