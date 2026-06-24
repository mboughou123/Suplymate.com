"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  X,
  Pencil,
  ExternalLink,
  Save,
  Loader2,
  ImageOff,
  ShieldCheck,
  Trash2,
  HelpCircle,
  Copy,
  ImageIcon,
  Images,
} from "lucide-react";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductStatus } from "@/data/products";
import { productCategories } from "@/data/products";
import { applyCommission, formatPrice } from "@/config/commerce";
import MediaManagerModal from "@/components/admin/media/MediaManagerModal";

type Props = {
  initialProducts: ScrapedProduct[];
  commissionRate: number;
};

type Filter = "all" | ProductStatus;

const STATUS_STYLES: Record<ProductStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
  needs_info: "bg-sky-50 text-sky-700",
};

const STATUS_LABEL: Record<ProductStatus, string> = {
  pending: "pending",
  approved: "published",
  rejected: "rejected",
  needs_info: "needs info",
};

const GRADIENTS = [
  "linear-gradient(135deg, #0b1b30, #143a5f 55%, rgba(14,165,183,0.55))",
  "linear-gradient(135deg, #1e293b, #0b1b30 55%, rgba(20,184,166,0.5))",
  "linear-gradient(135deg, #102a43, #1e5580 60%, rgba(96,165,250,0.4))",
];

function normName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

type Draft = {
  name: string;
  category: string;
  description: string;
  basePrice: string;
  priceUnit: string;
  commissionRate: string;
  moq: string;
  shippingTime: string;
  images: string;
  productUrl: string;
  imageSourceUrl: string;
  verifiedSupplier: boolean;
};

function toDraft(p: ScrapedProduct): Draft {
  return {
    name: p.name,
    category: p.category,
    description: p.description ?? "",
    basePrice: p.basePrice != null ? String(p.basePrice) : "",
    priceUnit: p.priceUnit ?? "",
    commissionRate: p.commissionRate != null ? String(p.commissionRate) : "",
    moq: p.moq ?? "",
    shippingTime: p.shippingTime ?? "",
    images: (p.images ?? []).join("\n"),
    productUrl: p.productUrl ?? "",
    imageSourceUrl: p.imageSourceUrl ?? p.images?.[0] ?? "",
    verifiedSupplier: p.verifiedSupplier,
  };
}

export default function AdminProductsClient({
  initialProducts,
  commissionRate,
}: Props) {
  const [products, setProducts] = useState<ScrapedProduct[]>(initialProducts);
  const [filter, setFilter] = useState<Filter>("pending");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mediaFor, setMediaFor] = useState<ScrapedProduct | null>(null);

  const counts = useMemo(() => {
    const c = { all: products.length, pending: 0, approved: 0, rejected: 0, needs_info: 0 };
    for (const p of products) c[p.status]++;
    return c;
  }, [products]);

  const suppliers = useMemo(
    () =>
      [...new Map(products.map((p) => [p.supplierId, p.supplierName])).entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  // Duplicate detection: flag ids that share a normalized name within the same
  // supplier, the same source URL, or the same primary image URL.
  const duplicateIds = useMemo(() => {
    const byKey = new Map<string, string[]>();
    const add = (key: string, id: string) => {
      const arr = byKey.get(key) ?? [];
      arr.push(id);
      byKey.set(key, arr);
    };
    for (const p of products) {
      add(`n:${p.supplierId}:${normName(p.name)}`, p.id);
      if (p.sourceUrl) add(`u:${p.sourceUrl}`, p.id);
      const img = p.images?.[0];
      if (img) add(`i:${img}`, p.id);
    }
    const dups = new Set<string>();
    for (const ids of byKey.values()) {
      if (ids.length > 1) ids.forEach((id) => dups.add(id));
    }
    return dups;
  }, [products]);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (supplierFilter && p.supplierId !== supplierFilter) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.supplierName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [products, filter, supplierFilter, categoryFilter, search]);

  function displayedPrice(p: ScrapedProduct, base?: number, rate?: number | null) {
    const b = base ?? p.basePrice;
    if (b == null) return "Contact for pricing";
    return formatPrice(applyCommission(b, rate ?? p.commissionRate ?? commissionRate), p.currency);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.product) {
        setError(data?.error ?? "Update failed. Please try again.");
        return null;
      }
      setProducts((prev) => prev.map((p) => (p.id === id ? data.product : p)));
      return data.product as ScrapedProduct;
    } catch {
      setError("Network error. Please try again.");
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Permanently delete this product? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Delete failed. Please try again.");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function bulk(status: ProductStatus) {
    if (selected.size === 0) return;
    setBulkBusy(true);
    setError(null);
    const ids = [...selected];
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await patch(id, { status });
    }
    setSelected(new Set());
    setBulkBusy(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(visible.map((p) => p.id)));
  }

  function startEdit(p: ScrapedProduct) {
    setEditingId(p.id);
    setDraft(toDraft(p));
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    const body = {
      name: draft.name,
      category: draft.category,
      description: draft.description,
      basePrice: draft.basePrice === "" ? null : Number(draft.basePrice),
      priceUnit: draft.priceUnit,
      commissionRate: draft.commissionRate === "" ? null : Number(draft.commissionRate),
      moq: draft.moq,
      shippingTime: draft.shippingTime,
      images: draft.images.split(/\n+/).map((s) => s.trim()).filter(Boolean),
      productUrl: draft.productUrl.trim() || null,
      imageSourceUrl: draft.imageSourceUrl.trim() || null,
      verifiedSupplier: draft.verifiedSupplier,
    };
    const updated = await patch(id, body);
    if (updated) {
      setEditingId(null);
      setDraft(null);
    }
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "approved", label: `Published (${counts.approved})` },
    { key: "needs_info", label: `Needs info (${counts.needs_info})` },
    { key: "rejected", label: `Rejected (${counts.rejected})` },
    { key: "all", label: `All (${counts.all})` },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="border-b border-slate-200 bg-gradient-to-br from-navy-dark to-navy py-10 text-white">
        <div className="container-page">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Admin
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            Scraped product review
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Review, edit and publish scraped products before they appear in the public
            catalogue. Nothing is published automatically. Prices shown to buyers include
            the {Math.round(commissionRate * 100)}% platform commission.
          </p>
        </div>
      </div>

      <div className="container-page py-8">
        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                filter === t.key
                  ? "bg-navy text-white"
                  : "border border-slate-200 bg-white text-ink-muted hover:border-cyan/40 hover:text-cyan"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Secondary filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search name or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
          />
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
          >
            <option value="">All categories</option>
            {productCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk action bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">
          <button onClick={selectAllVisible} className="font-medium text-cyan hover:underline">
            Select all ({visible.length})
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-ink-muted hover:underline"
            >
              Clear ({selected.size})
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              disabled={selected.size === 0 || bulkBusy}
              onClick={() => bulk("approved")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Publish selected
            </button>
            <button
              disabled={selected.size === 0 || bulkBusy}
              onClick={() => bulk("rejected")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Reject selected
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}

        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-ink-muted">
            No products in this view.
          </p>
        ) : (
          <div className="space-y-4">
            {visible.map((p, i) => {
              const isEditing = editingId === p.id;
              const busy = busyId === p.id;
              const img = p.images?.[0];
              const isDup = duplicateIds.has(p.id);
              const isSelected = selected.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-card ${
                    isSelected ? "border-cyan ring-1 ring-cyan/30" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row">
                    {/* Select + preview */}
                    <div className="flex shrink-0 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
                        aria-label={`Select ${p.name}`}
                      />
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={p.name}
                          className="h-24 w-24 rounded-xl object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-24 w-24 flex-col items-center justify-center rounded-xl text-white"
                          style={{ backgroundImage: GRADIENTS[i % GRADIENTS.length] }}
                        >
                          <ImageOff className="h-5 w-5 opacity-80" aria-hidden />
                          <span className="mt-1 text-[10px] opacity-90">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-ink">{p.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[p.status]}`}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                        {p.verifiedSupplier && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            <BadgeCheck className="h-3 w-3" aria-hidden /> Verified
                          </span>
                        )}
                        {isDup && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                            <Copy className="h-3 w-3" aria-hidden /> Possible duplicate
                          </span>
                        )}
                        {!img && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            No image · stays unpublished
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {p.supplierName}
                        {p.supplierCountry ? ` · ${p.supplierCountry}` : ""} · {p.category}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-ink-muted">
                          Base:{" "}
                          <span className="font-semibold text-ink">
                            {p.basePrice != null ? formatPrice(p.basePrice, p.currency) : "—"}
                          </span>
                        </span>
                        <span className="text-ink-muted">
                          Buyer price:{" "}
                          <span className="font-bold text-cyan">{displayedPrice(p)}</span>
                          {p.priceUnit ? ` / ${p.priceUnit}` : ""}
                        </span>
                        {p.moq && <span className="text-ink-dim">MOQ: {p.moq}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        <a
                          href={p.productUrl ?? p.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-xs text-ink-dim hover:text-cyan"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden />
                          Source page
                        </a>
                        {(p.imageSourceUrl ?? img) && (
                          <a
                            href={p.imageSourceUrl ?? img}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex items-center gap-1 text-xs text-ink-dim hover:text-cyan"
                          >
                            <ImageIcon className="h-3 w-3" aria-hidden />
                            Image source
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-1">
                      <button
                        onClick={() => patch(p.id, { status: "approved" })}
                        disabled={busy || p.status === "approved"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        <Check className="h-4 w-4" aria-hidden /> Publish
                      </button>
                      <button
                        onClick={() => patch(p.id, { status: "rejected" })}
                        disabled={busy || p.status === "rejected"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                      >
                        <X className="h-4 w-4" aria-hidden /> Reject
                      </button>
                      <button
                        onClick={() => patch(p.id, { status: "needs_info" })}
                        disabled={busy || p.status === "needs_info"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-40"
                      >
                        <HelpCircle className="h-4 w-4" aria-hidden /> Needs info
                      </button>
                      <button
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(p))}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
                      >
                        <Pencil className="h-4 w-4" aria-hidden /> {isEditing ? "Close" : "Edit"}
                      </button>
                      <button
                        onClick={() => setMediaFor(p)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
                      >
                        <Images className="h-4 w-4" aria-hidden /> Images
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink-muted hover:border-rose-200 hover:text-rose-700 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Editor */}
                  {isEditing && draft && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-ink">
                          Title
                          <input
                            value={draft.name}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Category
                          <select
                            value={draft.category}
                            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          >
                            {productCategories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-semibold text-ink sm:col-span-2">
                          Description
                          <textarea
                            value={draft.description}
                            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Base price (blank = no public price)
                          <input
                            type="number"
                            step="0.01"
                            value={draft.basePrice}
                            onChange={(e) => setDraft({ ...draft, basePrice: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Price unit (e.g. ton, meter, piece)
                          <input
                            value={draft.priceUnit}
                            onChange={(e) => setDraft({ ...draft, priceUnit: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Commission override (e.g. 0.12; blank = global)
                          <input
                            type="number"
                            step="0.01"
                            value={draft.commissionRate}
                            onChange={(e) => setDraft({ ...draft, commissionRate: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          MOQ
                          <input
                            value={draft.moq}
                            onChange={(e) => setDraft({ ...draft, moq: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Shipping time
                          <input
                            value={draft.shippingTime}
                            onChange={(e) => setDraft({ ...draft, shippingTime: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Product source URL
                          <input
                            value={draft.productUrl}
                            onChange={(e) => setDraft({ ...draft, productUrl: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Image source URL (attribution)
                          <input
                            value={draft.imageSourceUrl}
                            onChange={(e) => setDraft({ ...draft, imageSourceUrl: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink sm:col-span-2">
                          Image URLs (one per line — first is the card image)
                          <textarea
                            value={draft.images}
                            onChange={(e) => setDraft({ ...draft, images: e.target.value })}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                          <input
                            type="checkbox"
                            checked={draft.verifiedSupplier}
                            onChange={(e) =>
                              setDraft({ ...draft, verifiedSupplier: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
                          />
                          Mark supplier as verified
                        </label>
                        <button
                          onClick={() => saveEdit(p.id)}
                          disabled={busy}
                          className="btn-primary inline-flex items-center gap-1.5"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Save className="h-4 w-4" aria-hidden />
                          )}
                          Save changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {mediaFor && (
        <MediaManagerModal
          entityType="PRODUCT"
          entityId={mediaFor.id}
          allowedTypes={["PRODUCT_PRIMARY", "PRODUCT_GALLERY"]}
          defaultType="PRODUCT_GALLERY"
          title={`Manage images · ${mediaFor.name}`}
          description="Upload, reorder, set the primary image, edit captions/alt text and publish. Published images appear on the public product card & detail page; the primary image is shown first. Logos, factory and certificate images are kept separate."
          onClose={() => setMediaFor(null)}
        />
      )}
    </div>
  );
}
