"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Truck, Minus, Plus } from "lucide-react";
import type { ProductDetail } from "@/lib/product-detail";
import { formatPrice } from "@/config/commerce";
import ContactSupplierButton from "@/components/chat/ContactSupplierButton";

type Props = {
  detail: ProductDetail;
  currency: string;
  productName: string;
};

export default function ProductPurchasePanel({ detail, currency, productName }: Props) {
  const { listedPrice, unit, supplier, leadTime } = detail;
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const [qty, setQty] = useState(1);

  return (
    <div className="space-y-4">
      {/* Purchase / price card */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Order quantity
        </p>
        <div className="mt-2 inline-flex items-center rounded-xl border border-line">
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
            className="w-20 border-x border-line py-2 text-center text-sm font-semibold text-ink focus:outline-none"
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

        {/* The unit price is the supplier's listed price plus the service fee.
            There is no volume-discount ladder: we hold one price, not a price
            list, and the supplier has agreed no discount at any volume. */}
        {listedPrice ? (
          <>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm text-ink-muted">{t("listedPrice")}</span>
              <span className="text-2xl font-extrabold text-cyan">
                {formatPrice(listedPrice.price, currency)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">Est. subtotal</span>
              <span className="text-base font-bold text-ink">
                {formatPrice(listedPrice.price * qty, currency)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-ink-dim">{t("priceNote")}</p>
          </>
        ) : (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-base font-semibold text-ink">{tc("contactForPricing")}</p>
            <p className="mt-1 text-[11px] text-ink-dim">{t("noPublicPriceNote")}</p>
          </div>
        )}

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

      {/* Logistics. The shipping port, Incoterms, freight methods and packaging
          spec that filled this box were picked from pools per product; the only
          logistics fact we hold is a supplier-stated lead time, when there is
          one. */}
      {leadTime && (
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Truck className="h-5 w-5 text-teal" aria-hidden />
            {t("shippingTime")}
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">{leadTime}</p>
          <p className="mt-1 text-[11px] text-ink-dim">{t("leadTimeNote")}</p>
        </div>
      )}
    </div>
  );
}
