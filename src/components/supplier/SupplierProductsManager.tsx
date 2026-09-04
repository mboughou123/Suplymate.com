"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Package, Trash2, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { INDUSTRIES } from "@/data/industries";

type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  basePrice: number | null;
  priceUnit: string | null;
  currency: string;
  moq: string | null;
  shippingTime: string | null;
  shortDescription: string | null;
  status: string;
  updatedAt: string;
};

const input =
  "mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-ink focus:border-cyan/60 focus:outline-none focus:ring-2 focus:ring-cyan/20";

const CATEGORIES = Array.from(new Set(INDUSTRIES.flatMap((i) => i.subcategories)));

export default function SupplierProductsManager({ hasProfile }: { hasProfile: boolean }) {
  const t = useTranslations("supplierDashboard");
  const tErrors = useTranslations("errors");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: CATEGORIES[0] ?? "Steel",
    basePrice: "",
    priceUnit: "",
    moq: "",
    shippingTime: "",
    imageUrl: "",
    shortDescription: "",
  });
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      const res = await fetch("/api/supplier/products", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || tErrors("generic"));
      setProducts(data.products ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : tErrors("generic"));
      setProducts([]);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setAdding(true);
    setFormError(null);
    try {
      const res = await fetch("/api/supplier/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(data?.error || tErrors("generic"));
        return;
      }
      setProducts((p) => [data.product, ...(p ?? [])]);
      setForm((f) => ({ ...f, name: "", basePrice: "", moq: "", shippingTime: "", imageUrl: "", shortDescription: "" }));
    } catch {
      setFormError(tErrors("network"));
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    const prev = products;
    setProducts((p) => (p ?? []).filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/supplier/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) setProducts(prev);
    } catch {
      setProducts(prev);
    }
  }

  const statusLabel = (s: string) =>
    s === "approved" ? t("approved") : s === "rejected" ? t("rejected") : t("pendingReview");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        {products === null ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p>{loadError}</p>
              <button type="button" onClick={load} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry
              </button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Package className="h-10 w-10 text-slate-300" aria-hidden />
            <h2 className="mt-4 text-base font-semibold text-ink">{t("noProductsTitle")}</h2>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">{t("noProductsBody")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 text-slate-300">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        p.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.status === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {p.category}
                    {" · "}
                    {p.basePrice != null
                      ? `${p.currency} ${p.basePrice.toLocaleString()}${p.priceUnit ? ` / ${p.priceUnit}` : ""}`
                      : t("contactForPricing")}
                    {p.moq ? ` · MOQ ${p.moq}` : ""}
                    {p.shippingTime ? ` · ${p.shippingTime}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="cursor-pointer rounded-lg p-2 text-ink-dim transition hover:bg-red-50 hover:text-red-600"
                  aria-label={t("delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <form onSubmit={add} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-ink">{t("addProductCta")}</h2>
          <p className="mt-1 text-xs text-ink-muted">{t("productPendingHint")}</p>
          {!hasProfile && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t("noProfileTitle")} —{" "}
              <Link href="/supplier-dashboard/profile" className="font-semibold underline">
                {t("createProfile")}
              </Link>
            </p>
          )}
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="p-name" className="text-xs font-medium text-ink-muted">{t("productName")}</label>
              <input id="p-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
            </div>
            <div>
              <label htmlFor="p-cat" className="text-xs font-medium text-ink-muted">{t("productCategory")}</label>
              <select id="p-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={input}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="p-price" className="text-xs font-medium text-ink-muted">{t("productPrice")} (USD)</label>
                <input id="p-price" type="number" min={0} step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="p-unit" className="text-xs font-medium text-ink-muted">{t("productPriceUnit")}</label>
                <input id="p-unit" placeholder="ton / pc" value={form.priceUnit} onChange={(e) => setForm({ ...form, priceUnit: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="p-moq" className="text-xs font-medium text-ink-muted">{t("productMoq")}</label>
                <input id="p-moq" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} className={input} />
              </div>
              <div>
                <label htmlFor="p-lead" className="text-xs font-medium text-ink-muted">{t("productLeadTime")}</label>
                <input id="p-lead" value={form.shippingTime} onChange={(e) => setForm({ ...form, shippingTime: e.target.value })} className={input} />
              </div>
            </div>
            <div>
              <label htmlFor="p-img" className="text-xs font-medium text-ink-muted">{t("productImage")}</label>
              <input id="p-img" type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" className={input} />
            </div>
            <div>
              <label htmlFor="p-desc" className="text-xs font-medium text-ink-muted">{t("productSummary")}</label>
              <textarea id="p-desc" rows={2} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className={input} />
            </div>
          </div>
          {formError && (
            <p className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {formError}
            </p>
          )}
          <button type="submit" disabled={adding || !hasProfile} className="btn-primary mt-4 w-full disabled:opacity-60">
            {adding && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {adding ? t("adding") : t("addProductCta")}
          </button>
        </form>
      </aside>
    </div>
  );
}
