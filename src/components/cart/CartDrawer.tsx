"use client";

import Link from "next/link";
import { X, Trash2, ShoppingCart, Minus, Plus } from "lucide-react";
import { useCart } from "./CartProvider";

// Slide-over cart drawer. Honest pricing: shows supplier-listed price when
// available, otherwise "Contact supplier for pricing". No grand total is shown
// because real pricing comes from supplier quotes, not listed prices.
export default function CartDrawer() {
  const { cart, isOpen, closeDrawer, updateQuantity, remove } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Cart">
      <button
        type="button"
        aria-label="Close cart"
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={closeDrawer}
      />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <ShoppingCart className="h-5 w-5 text-cyan" aria-hidden />
            Procurement cart
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <ShoppingCart className="h-10 w-10 text-slate-300" aria-hidden />
            <p className="text-sm text-ink-muted">Your cart is empty.</p>
            <Link
              href="/products"
              onClick={closeDrawer}
              className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan/90"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-3 px-1 text-xs text-ink-dim">
                {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} from {cart.supplierCount}{" "}
                supplier{cart.supplierCount === 1 ? "" : "s"}. Requests are sent as one RFQ per
                supplier.
              </p>
              <ul className="space-y-3">
                {cart.items.map((i) => (
                  <li key={i.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {i.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{i.productName}</p>
                        <p className="truncate text-xs text-ink-muted">{i.supplierName}</p>
                        <p className="mt-1 text-xs text-ink-dim">
                          {i.basePrice != null
                            ? `${i.currency ?? "USD"} ${i.basePrice.toLocaleString()}${
                                i.unit ? ` / ${i.unit}` : ""
                              } · supplier-listed`
                            : "Contact supplier for pricing"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(i.id)}
                        className="h-fit rounded-lg p-1.5 text-ink-dim hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(i.id, i.quantity - 1)}
                          className="px-2 py-1 text-ink-muted hover:bg-slate-50 disabled:opacity-40"
                          disabled={i.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-10 px-2 text-center text-sm font-medium text-ink">
                          {i.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(i.id, i.quantity + 1)}
                          className="px-2 py-1 text-ink-muted hover:bg-slate-50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {i.moq != null && (
                        <span className="text-[11px] text-ink-dim">MOQ {i.moq.toLocaleString()}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-slate-200 px-5 py-4">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="block w-full rounded-lg bg-cyan px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-cyan/90"
              >
                Review cart &amp; request quotes
              </Link>
              <p className="mt-2 text-center text-[11px] text-ink-dim">
                No payment is taken. Suppliers respond with formal quotes.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
