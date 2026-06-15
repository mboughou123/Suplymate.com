"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  Truck,
  Package,
  CreditCard,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";
import type { PriceTier, ProductDetail } from "@/lib/product-detail";
import { formatPrice } from "@/config/commerce";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";

type Props = {
  detail: ProductDetail;
  currency: string;
  productName: string;
};

function tierForQty(tiers: PriceTier[], qty: number): PriceTier {
  let chosen = tiers[0];
  for (const t of tiers) if (qty >= t.minQty) chosen = t;
  return chosen;
}

export default function ProductPurchasePanel({ detail, currency, productName }: Props) {
  const { priceTiers, unit, supplier, shipping } = detail;
  const [qty, setQty] = useState(priceTiers[0]?.minQty ?? 1);

  const tier = useMemo(() => tierForQty(priceTiers, qty), [priceTiers, qty]);
  const subtotal = tier.price * qty;

  return (
    <div className="space-y-4">
      {/* Purchase / price card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Order quantity
        </p>
        <div className="mt-2 inline-flex items-center rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-ink-muted hover:text-cyan"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 border-x border-slate-200 py-2 text-center text-sm font-semibold text-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="flex h-10 w-10 items-center justify-center text-ink-muted hover:text-cyan"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
          <span className="px-3 text-sm text-ink-muted">{unit}s</span>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-4">
          <span className="text-sm text-ink-muted">Unit price</span>
          <span className="text-2xl font-extrabold text-cyan">
            {formatPrice(tier.price, currency)}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">Est. subtotal</span>
          <span className="text-base font-bold text-ink">
            {formatPrice(subtotal, currency)}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <ContactSupplierButton
            supplierId={supplier.id}
            supplierName={supplier.name}
            productName={productName}
            label="Send Inquiry"
            className="btn-primary inline-flex w-full items-center justify-center gap-1.5"
          />
          <ContactSupplierButton
            supplierId={supplier.id}
            supplierName={supplier.name}
            productName={productName}
            label="Chat with Supplier"
            className="btn-secondary inline-flex w-full items-center justify-center gap-1.5"
          />
        </div>
      </div>

      {/* Trade protection box */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          Suplymate Trade Assurance
        </div>
        <ul className="mt-3 space-y-2 text-xs text-emerald-900/80">
          <li className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            Secure payment held until you confirm delivery
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            Product quality & on-time shipment protection
          </li>
          <li className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            Refund policy if the order is not as described
          </li>
        </ul>
      </div>

      {/* Shipping box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <Truck className="h-5 w-5 text-teal" aria-hidden />
          Shipping & logistics
        </div>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Lead time</dt>
            <dd className="font-semibold text-ink">{shipping.leadTime}</dd>
          </div>
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
            <dd className="text-right font-semibold text-ink">
              {shipping.methods.join(", ")}
            </dd>
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
