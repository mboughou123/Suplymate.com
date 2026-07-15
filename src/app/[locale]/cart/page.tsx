"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { Trash2, Minus, Plus, ShoppingCart, Building2 } from "lucide-react";
import { useCart, type CartItem } from "@/components/cart/CartProvider";
import AnalyzeCartPanel from "@/components/cart/AnalyzeCartPanel";

export default function CartPage() {
  const t = useTranslations("cart");
  const common = useTranslations("common");
  const rfqs = useTranslations("rfqs");
  const { cart, updateQuantity, remove, clear, refresh } = useCart();
  const { status } = useSession();
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialMsg, setPartialMsg] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, { supplierName: string; items: CartItem[] }>();
    for (const item of cart.items) {
      const g = map.get(item.supplierId) ?? { supplierName: item.supplierName, items: [] };
      g.items.push(item);
      map.set(item.supplierId, g);
    }
    return [...map.entries()];
  }, [cart.items]);

  const submit = async () => {
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=/cart");
      return;
    }
    setSubmitting(true);
    setError(null);
    setPartialMsg(null);
    try {
      const res = await fetch("/api/rfq/from-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, deadline, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      await refresh();
      if (data.partial && data.failed?.length) {
        setPartialMsg(
          `${data.rfqs.length} RFQ(s) submitted. ${data.failed.length} supplier(s) failed — those items remain in your cart.`
        );
        setSubmitting(false);
        return;
      }
      router.push("/rfqs?submitted=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <ShoppingCart className="h-6 w-6 text-cyan" aria-hidden />
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{t("noPaymentNote")}</p>

      {partialMsg && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {partialMsg}{" "}
          <Link href="/rfqs" className="font-semibold text-cyan hover:underline">
            {rfqs("title")}
          </Link>
        </div>
      )}

      {cart.items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 py-16 text-center">
          <ShoppingCart className="h-10 w-10 text-slate-300" aria-hidden />
          <p className="text-ink-muted">{t("empty")}</p>
          <Link href="/products" className="rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan/90">
            {t("browseProducts")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {groups.map(([supplierId, group]) => (
              <div key={supplierId} className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <Building2 className="h-4 w-4 text-ink-muted" aria-hidden />
                  <Link href={`/supplier/${supplierId}`} className="text-sm font-semibold text-ink hover:text-cyan">
                    {group.supplierName}
                  </Link>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-ink-dim">1 RFQ</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {group.items.map((i) => (
                    <li key={i.id} className="flex gap-3 px-4 py-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {i.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{i.productName}</p>
                        <p className="mt-0.5 text-xs text-ink-dim">
                          {i.basePrice != null
                            ? common("priceFrom", {
                                price: `${i.currency ?? "USD"} ${i.basePrice.toLocaleString()}`,
                                unit: i.unit ?? "",
                              })
                            : common("contactForPricing")}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="inline-flex items-center rounded-lg border border-slate-200">
                            <button type="button" onClick={() => updateQuantity(i.id, i.quantity - 1)} disabled={i.quantity <= 1} className="px-2 py-1 text-ink-muted hover:bg-slate-50 disabled:opacity-40" aria-label={t("decreaseQuantity")}>
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-10 px-2 text-center text-sm font-medium">{i.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(i.id, i.quantity + 1)} className="px-2 py-1 text-ink-muted hover:bg-slate-50" aria-label={t("increaseQuantity")}>
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {i.moq != null && <span className="text-[11px] text-ink-dim">{common("moq", { value: i.moq.toLocaleString() })}</span>}
                          <button type="button" onClick={() => remove(i.id)} className="ml-auto rounded-lg p-1.5 text-ink-dim hover:bg-red-50 hover:text-red-600" aria-label={t("removeItem")}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button type="button" onClick={clear} className="text-sm text-ink-dim hover:text-red-600">
              {common("cancel")}
            </button>
          </div>

          <aside className="space-y-4">
            <AnalyzeCartPanel destination={destination} deadline={deadline} note={note} disabled={submitting} />
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="font-display text-lg font-bold text-ink">{rfqs("sendRfq")}</h2>
              <p className="mt-1 text-xs text-ink-dim">
                {t("itemsSummary", {
                  itemCount: cart.itemCount,
                  supplierCount: groups.length,
                })}
              </p>
              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="text-ink-muted">{common("to")} ({common("optional")})</span>
                  <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Rotterdam, NL" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-muted">{common("from")} ({common("optional")})</span>
                  <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="e.g. within 30 days" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm">
                  <span className="text-ink-muted">{common("optional")}</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Specs, packaging, certifications required…" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button type="button" onClick={submit} disabled={submitting} className="mt-4 w-full rounded-lg bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan/90 disabled:opacity-60">
                {submitting ? common("loading") : status === "authenticated" ? rfqs("sendRfq") : common("getStarted")}
              </button>
              <p className="mt-2 text-center text-[11px] text-ink-dim">{t("noPaymentNote")}</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
