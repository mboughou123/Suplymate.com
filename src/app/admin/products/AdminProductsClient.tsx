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
} from "lucide-react";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductStatus } from "@/data/products";
import { applyCommission, formatPrice } from "@/config/commerce";

type Props = {
  initialProducts: ScrapedProduct[];
  commissionRate: number;
};

type Filter = "all" | ProductStatus;

const STATUS_STYLES: Record<ProductStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

const GRADIENTS = [
  "linear-gradient(135deg, #0b1b30, #143a5f 55%, rgba(14,165,183,0.55))",
  "linear-gradient(135deg, #1e293b, #0b1b30 55%, rgba(20,184,166,0.5))",
  "linear-gradient(135deg, #102a43, #1e5580 60%, rgba(96,165,250,0.4))",
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type Draft = {
  name: string;
  description: string;
  basePrice: string;
  commissionRate: string;
  moq: string;
  shippingTime: string;
  images: string;
  videos: string;
  supplierLogo: string;
  verifiedSupplier: boolean;
};

function toDraft(p: ScrapedProduct): Draft {
  return {
    name: p.name,
    description: p.description ?? "",
    basePrice: p.basePrice != null ? String(p.basePrice) : "",
    commissionRate: p.commissionRate != null ? String(p.commissionRate) : "",
    moq: p.moq ?? "",
    shippingTime: p.shippingTime ?? "",
    images: (p.images ?? []).join("\n"),
    videos: (p.videos ?? []).join("\n"),
    supplierLogo: p.supplierLogo ?? "",
    verifiedSupplier: p.verifiedSupplier,
  };
}

export default function AdminProductsClient({
  initialProducts,
  commissionRate,
}: Props) {
  const [products, setProducts] = useState<ScrapedProduct[]>(initialProducts);
  const [filter, setFilter] = useState<Filter>("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: products.length, pending: 0, approved: 0, rejected: 0 };
    for (const p of products) c[p.status]++;
    return c;
  }, [products]);

  const visible = useMemo(
    () => (filter === "all" ? products : products.filter((p) => p.status === filter)),
    [products, filter]
  );

  function displayedPrice(p: ScrapedProduct, base?: number, rate?: number | null) {
    const b = base ?? p.basePrice;
    if (b == null) return "—";
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

  function startEdit(p: ScrapedProduct) {
    setEditingId(p.id);
    setDraft(toDraft(p));
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    const body = {
      name: draft.name,
      description: draft.description,
      basePrice: draft.basePrice === "" ? null : Number(draft.basePrice),
      commissionRate: draft.commissionRate === "" ? null : Number(draft.commissionRate),
      moq: draft.moq,
      shippingTime: draft.shippingTime,
      images: draft.images.split(/\n+/).map((s) => s.trim()).filter(Boolean),
      videos: draft.videos.split(/\n+/).map((s) => s.trim()).filter(Boolean),
      supplierLogo: draft.supplierLogo.trim() || null,
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
    { key: "approved", label: `Approved (${counts.approved})` },
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
            Review, edit and approve scraped products before they appear in the public
            catalogue. Only approved items are published. Prices shown to buyers include
            the {Math.round(commissionRate * 100)}% platform commission.
          </p>
        </div>
      </div>

      <div className="container-page py-8">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
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
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
                >
                  <div className="flex flex-col gap-4 p-5 sm:flex-row">
                    {/* Preview */}
                    <div className="shrink-0">
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
                          {p.status}
                        </span>
                        {p.verifiedSupplier && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            <BadgeCheck className="h-3 w-3" aria-hidden /> Verified
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {initials(p.supplierName)} · {p.supplierName} · {p.category}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-ink-muted">
                          Base: <span className="font-semibold text-ink">
                            {p.basePrice != null ? formatPrice(p.basePrice, p.currency) : "—"}
                          </span>
                        </span>
                        <span className="text-ink-muted">
                          Displayed:{" "}
                          <span className="font-bold text-cyan">{displayedPrice(p)}</span>
                        </span>
                        {p.moq && <span className="text-ink-dim">MOQ: {p.moq}</span>}
                      </div>
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-dim hover:text-cyan"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden />
                        {p.sourceUrl}
                      </a>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                      <button
                        onClick={() => patch(p.id, { status: "approved" })}
                        disabled={busy || p.status === "approved"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        <Check className="h-4 w-4" aria-hidden /> Approve
                      </button>
                      <button
                        onClick={() => patch(p.id, { status: "rejected" })}
                        disabled={busy || p.status === "rejected"}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                      >
                        <X className="h-4 w-4" aria-hidden /> Reject
                      </button>
                      <button
                        onClick={() => (isEditing ? setEditingId(null) : startEdit(p))}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
                      >
                        <Pencil className="h-4 w-4" aria-hidden /> {isEditing ? "Close" : "Edit"}
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
                          Supplier logo URL
                          <input
                            value={draft.supplierLogo}
                            onChange={(e) => setDraft({ ...draft, supplierLogo: e.target.value })}
                            placeholder="https://… (leave blank for initials)"
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
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
                          Base price ({draft.basePrice && draft.commissionRate
                            ? "override commission below"
                            : "supplier price"})
                          <input
                            type="number"
                            step="0.01"
                            value={draft.basePrice}
                            onChange={(e) => setDraft({ ...draft, basePrice: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Commission override (e.g. 0.12 = 12%, blank = global)
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
                          Image URLs (one per line)
                          <textarea
                            value={draft.images}
                            onChange={(e) => setDraft({ ...draft, images: e.target.value })}
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
                          />
                        </label>
                        <label className="text-xs font-semibold text-ink">
                          Video URLs (one per line)
                          <textarea
                            value={draft.videos}
                            onChange={(e) => setDraft({ ...draft, videos: e.target.value })}
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
                        <div className="flex gap-2">
                          <span className="self-center text-xs text-ink-dim">
                            Preview:{" "}
                            <span className="font-bold text-cyan">
                              {displayedPrice(
                                p,
                                draft.basePrice === "" ? undefined : Number(draft.basePrice),
                                draft.commissionRate === "" ? null : Number(draft.commissionRate)
                              )}
                            </span>
                          </span>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
