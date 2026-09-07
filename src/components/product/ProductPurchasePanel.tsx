import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Clock, Package, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import type { ProductDetail } from "@/lib/product-detail";
import { formatPrice } from "@/config/commerce";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";

type Props = {
  detail: ProductDetail;
  currency: string;
  productName: string;
  productId?: string;
  /** Only show the indicative from-price when the supplier lists a public price. */
  hasPublicPrice?: boolean;
};

/**
 * Sidebar on the product page. Suplymate is not a marketplace: there is no
 * checkout, payment or escrow here — the buyer requests a quote and deals with
 * the supplier directly.
 */
export default function ProductPurchasePanel({
  detail,
  currency,
  productName,
  productId,
  hasPublicPrice = true,
}: Props) {
  const { priceTiers, unit, supplier, shipping, moq } = detail;
  const fromTier = priceTiers.reduce((best, t) => (t.price < best.price ? t : best), priceTiers[0]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">Get a quote</p>
        {hasPublicPrice && fromTier ? (
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm text-ink-muted">Indicative from</span>
            <span className="text-2xl font-extrabold text-cyan">
              {formatPrice(fromTier.price, currency)}
              <span className="ml-1 text-sm font-medium text-ink-dim">/ {unit}</span>
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">No public price listed — the supplier quotes on request.</p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="flex items-center gap-1 text-ink-dim">
              <PackageCheck className="h-3.5 w-3.5 text-teal" aria-hidden />
              MOQ
            </dt>
            <dd className="mt-1 font-semibold text-ink">{moq}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="flex items-center gap-1 text-ink-dim">
              <Clock className="h-3.5 w-3.5 text-teal" aria-hidden />
              Lead time
            </dt>
            <dd className="mt-1 font-semibold text-ink">{shipping.leadTime}</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-2">
          <ContactSupplierButton
            supplierId={supplier.id}
            supplierName={supplier.name}
            productName={productName}
            productId={productId}
            label="Request quote"
            quote
            className="btn-accent inline-flex w-full items-center justify-center gap-1.5"
          />
          <ContactSupplierButton
            supplierId={supplier.id}
            supplierName={supplier.name}
            productName={productName}
            label="Contact supplier"
            className="btn-secondary inline-flex w-full items-center justify-center gap-1.5"
          />
          <Link
            href={supplier.href}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-cyan transition hover:bg-cyan-soft"
          >
            View supplier
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-dim">
          Quotes, terms and payment are agreed directly with the supplier. Suplymate never
          processes or holds funds.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <ShieldCheck className="h-5 w-5 text-teal" aria-hidden />
          Before you commit
        </div>
        <ul className="mt-3 space-y-2 text-xs text-ink-muted">
          <li className="flex items-start gap-2">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            {supplier.verified
              ? "Verified supplier — company details checked manually by our team."
              : "Listed supplier — not yet verified. Confirm company details before ordering."}
          </li>
          <li className="flex items-start gap-2">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            Ask for mill test certificates and confirm specs, tolerances and packaging in the quote.
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <Truck className="h-5 w-5 text-teal" aria-hidden />
          Shipping & logistics
        </div>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Ships from</dt>
            <dd className="font-semibold text-ink">Port of {shipping.port}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Incoterms</dt>
            <dd className="font-semibold text-ink">{shipping.incoterms.join(" / ")}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-ink-muted">Methods</dt>
            <dd className="text-right font-semibold text-ink">{shipping.methods.join(", ")}</dd>
          </div>
        </dl>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-dim">
          <Package className="h-3.5 w-3.5" aria-hidden />
          {shipping.packaging}
        </p>
      </div>
    </div>
  );
}
