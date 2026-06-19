"use client";

import { useMemo, useRef, useState } from "react";
import {
  ShieldCheck,
  Upload,
  Globe2,
  Loader2,
  Check,
  X,
  Pencil,
  Save,
  Trash2,
  ExternalLink,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  FileText,
} from "lucide-react";
import type { AdminSupplier, VerificationStatus } from "@/lib/supplier-normalize";
import VerificationBadge from "@/components/VerificationBadge";
import ImportPreviewTable from "@/components/admin/ImportPreviewTable";
import { calculateSupplierCompleteness } from "@/lib/supplier-completeness";

// Completeness signals an admin should fix before verifying, in priority order.
function completenessWarnings(s: AdminSupplier): string[] {
  const warnings: string[] = [];
  if (!s.website) warnings.push("No website");
  if (!s.logoUrl) warnings.push("No logo");
  if (s.images.length === 0) warnings.push("No supplier photos");
  if (s.products.length === 0) warnings.push("No products linked");
  if (!s.description) warnings.push("No description");
  return warnings;
}

type Props = { initialSuppliers: AdminSupplier[] };
type Tab = "review" | "csv" | "scrape";
type ReviewFilter = "all" | VerificationStatus;

type RowError = { line: number; field?: string; message: string };
type DuplicateInfo = { candidateId: string; existingId: string; reason: string };
type ScrapeResult = {
  sourceUrl: string;
  ok: boolean;
  blockedReason?: string;
  name: string | null;
  products: { name: string }[];
  certifications: unknown[];
  images: string[];
  warnings: { stage: string; message: string }[];
};

const TABS: { key: Tab; label: string; Icon: typeof Upload }[] = [
  { key: "review", label: "Review queue", Icon: ShieldCheck },
  { key: "csv", label: "Import CSV", Icon: Upload },
  { key: "scrape", label: "Scrape websites", Icon: Globe2 },
];

const REVIEW_FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "needs_info", label: "Needs info" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

/* ------------------------------------------------------------------ */
/* Edit draft                                                          */
/* ------------------------------------------------------------------ */

type Draft = {
  name: string;
  industry: string;
  category: string;
  country: string;
  city: string;
  address: string;
  website: string;
  phone: string;
  email: string;
  description: string;
  logoUrl: string;
  imageUrl: string;
  moq: string;
  products: string;
  images: string;
  certificationImages: string;
  certifications: string;
};

function toDraft(s: AdminSupplier): Draft {
  return {
    name: s.name,
    industry: s.industry,
    category: s.category ?? "",
    country: s.country ?? "",
    city: s.city ?? "",
    address: s.address ?? "",
    website: s.website ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    description: s.description ?? "",
    logoUrl: s.logoUrl ?? "",
    imageUrl: s.imageUrl ?? "",
    moq: s.moq,
    products: s.products.join("\n"),
    images: s.images.join("\n"),
    certificationImages: s.certificationImages.join("\n"),
    certifications: s.certifications.map((c) => c.name).join("\n"),
  };
}

const lines = (v: string) =>
  v.split(/\n+/).map((s) => s.trim()).filter(Boolean);

export default function AdminImportSuppliersClient({ initialSuppliers }: Props) {
  const [tab, setTab] = useState<Tab>("review");
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>(initialSuppliers);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* ---- Review queue state ---- */
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* ---- CSV state ---- */
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvPreview, setCsvPreview] = useState<AdminSupplier[]>([]);
  const [csvErrors, setCsvErrors] = useState<RowError[]>([]);
  const [csvDuplicates, setCsvDuplicates] = useState<DuplicateInfo[]>([]);
  const [csvSelected, setCsvSelected] = useState<Set<string>>(new Set());

  /* ---- Scrape state ---- */
  const [urlsText, setUrlsText] = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<ScrapeResult[]>([]);
  const [scrapePreview, setScrapePreview] = useState<AdminSupplier[]>([]);
  const [scrapeSelected, setScrapeSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c = { all: suppliers.length, pending: 0, verified: 0, rejected: 0, needs_info: 0 };
    for (const s of suppliers) c[s.verificationStatus]++;
    return c;
  }, [suppliers]);

  const visible = useMemo(
    () =>
      reviewFilter === "all"
        ? suppliers
        : suppliers.filter((s) => s.verificationStatus === reviewFilter),
    [suppliers, reviewFilter]
  );

  function flash(msg: string) {
    setNotice(msg);
    setError(null);
    setTimeout(() => setNotice(null), 4000);
  }

  /* ---------------------------------------------------------------- */
  /* Review queue actions                                             */
  /* ---------------------------------------------------------------- */

  async function refresh() {
    setError(null);
    try {
      const res = await fetch("/api/admin/suppliers");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.suppliers)) setSuppliers(data.suppliers);
      else setError(data?.error ?? "Could not refresh.");
    } catch {
      setError("Network error refreshing list.");
    }
  }

  async function verify(id: string, status: VerificationStatus) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.supplier) {
        setSuppliers((prev) => prev.map((s) => (s.id === id ? data.supplier : s)));
        flash(`Marked “${data.supplier.name}” as ${status.replace("_", " ")}.`);
      } else setError(data?.error ?? "Update failed.");
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeSupplier(id: string) {
    if (!confirm("Remove this supplier? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        flash("Supplier removed.");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Delete failed.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(s: AdminSupplier) {
    setEditingId(s.id);
    setDraft(toDraft(s));
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    setBusyId(id);
    setError(null);
    const body = {
      name: draft.name,
      industry: draft.industry,
      category: draft.category || null,
      country: draft.country || null,
      city: draft.city || null,
      address: draft.address || null,
      website: draft.website || null,
      phone: draft.phone || null,
      email: draft.email || null,
      description: draft.description || null,
      logoUrl: draft.logoUrl || null,
      imageUrl: draft.imageUrl || null,
      moq: draft.moq || null,
      products: lines(draft.products),
      images: lines(draft.images),
      certificationImages: lines(draft.certificationImages),
      certifications: lines(draft.certifications).map((name) => ({ name })),
    };
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.supplier) {
        setSuppliers((prev) => prev.map((s) => (s.id === id ? data.supplier : s)));
        setEditingId(null);
        setDraft(null);
        flash("Supplier saved.");
      } else setError(data?.error ?? "Save failed.");
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /* CSV import                                                       */
  /* ---------------------------------------------------------------- */

  async function handleCsvFile(file: File) {
    setCsvName(file.name);
    setCsvLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/suppliers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not parse CSV.");
        return;
      }
      const previews: AdminSupplier[] = data.suppliers ?? [];
      setCsvPreview(previews);
      setCsvErrors(data.errors ?? []);
      setCsvDuplicates(data.duplicates ?? []);
      // Pre-select everything that isn't a duplicate.
      const dupIds = new Set<string>((data.duplicates ?? []).map((d: DuplicateInfo) => d.candidateId));
      setCsvSelected(new Set(previews.filter((p) => !dupIds.has(p.id)).map((p) => p.id)));
    } catch {
      setError("Network error parsing CSV.");
    } finally {
      setCsvLoading(false);
    }
  }

  async function saveCsvSelected() {
    const chosen = csvPreview.filter((p) => csvSelected.has(p.id));
    if (chosen.length === 0) {
      setError("Select at least one supplier to save.");
      return;
    }
    setCsvLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suppliers: chosen, skipDuplicates: false }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        flash(`Saved ${data.savedCount} supplier(s) as pending.`);
        setCsvPreview([]);
        setCsvSelected(new Set());
        setCsvErrors([]);
        setCsvDuplicates([]);
        setCsvName(null);
        if (fileRef.current) fileRef.current.value = "";
        await refresh();
        setTab("review");
      } else setError(data?.error ?? "Save failed.");
    } catch {
      setError("Network error saving suppliers.");
    } finally {
      setCsvLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Scrape                                                           */
  /* ---------------------------------------------------------------- */

  async function runScrape() {
    const urls = lines(urlsText);
    if (urls.length === 0) {
      setError("Add at least one URL.");
      return;
    }
    setScrapeLoading(true);
    setError(null);
    setScrapeResults([]);
    setScrapePreview([]);
    try {
      const res = await fetch("/api/admin/suppliers/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Scrape failed.");
        return;
      }
      const previews: AdminSupplier[] = data.suppliers ?? [];
      setScrapeResults(data.results ?? []);
      setScrapePreview(previews);
      setScrapeSelected(new Set(previews.map((p) => p.id)));
      flash(`Scraped ${data.counts?.scraped ?? 0} site(s), ${data.counts?.blocked ?? 0} blocked.`);
    } catch {
      setError("Network error during scrape.");
    } finally {
      setScrapeLoading(false);
    }
  }

  async function saveScrapeSelected() {
    const chosen = scrapePreview.filter((p) => scrapeSelected.has(p.id));
    if (chosen.length === 0) {
      setError("Select at least one scraped supplier to save.");
      return;
    }
    setScrapeLoading(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suppliers: chosen, skipDuplicates: true }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        flash(`Saved ${data.savedCount} scraped supplier(s) as pending.`);
        setScrapePreview([]);
        setScrapeResults([]);
        setScrapeSelected(new Set());
        setUrlsText("");
        await refresh();
        setTab("review");
      } else setError(data?.error ?? "Save failed.");
    } catch {
      setError("Network error.");
    } finally {
      setScrapeLoading(false);
    }
  }

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  const dupIdSet = useMemo(
    () => new Set(csvDuplicates.map((d) => d.candidateId)),
    [csvDuplicates]
  );

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-navy-dark to-navy py-10 text-white">
        <div className="container-page">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Admin
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Import suppliers</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Import suppliers from CSV or scrape public company websites, review and edit them, then
            verify before they appear publicly. Everything starts as <strong>pending</strong>.
          </p>
        </div>
      </div>

      <div className="container-page py-8">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === key
                  ? "bg-navy text-white"
                  : "border border-slate-200 bg-white text-ink-muted hover:border-cyan/40 hover:text-cyan"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700" role="status">
            {notice}
          </p>
        )}

        {tab === "review" && (
          <ReviewQueue
            visible={visible}
            counts={counts}
            reviewFilter={reviewFilter}
            setReviewFilter={setReviewFilter}
            refresh={refresh}
            editingId={editingId}
            draft={draft}
            setDraft={setDraft}
            setEditingId={setEditingId}
            startEdit={startEdit}
            saveEdit={saveEdit}
            verify={verify}
            removeSupplier={removeSupplier}
            busyId={busyId}
          />
        )}

        {tab === "csv" && (
          <section>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink">Upload a CSV</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Required column: <code className="rounded bg-slate-100 px-1">name</code>. Optional:
                industry, category, country, city, address, website, phone, email, description,
                logoUrl, products, certifications, certificationImages, moq, rating, sourceUrl.
                Multi-value cells use <code className="rounded bg-slate-100 px-1">|</code>.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="btn-primary inline-flex cursor-pointer items-center gap-2">
                  <Upload className="h-4 w-4" aria-hidden />
                  Choose CSV
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCsvFile(f);
                    }}
                  />
                </label>
                {csvName && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                    <FileText className="h-4 w-4" aria-hidden /> {csvName}
                  </span>
                )}
                {csvLoading && <Loader2 className="h-4 w-4 animate-spin text-cyan" aria-hidden />}
              </div>
            </div>

            {csvErrors.length > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4" aria-hidden /> {csvErrors.length} invalid row(s)
                  skipped
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-amber-800">
                  {csvErrors.slice(0, 8).map((e, i) => (
                    <li key={i}>
                      Line {e.line}: {e.message}
                    </li>
                  ))}
                  {csvErrors.length > 8 && <li>… and {csvErrors.length - 8} more</li>}
                </ul>
              </div>
            )}

            {csvPreview.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-muted">
                    {csvPreview.length} valid row(s) · {csvDuplicates.length} possible duplicate(s) ·{" "}
                    {csvSelected.size} selected
                  </p>
                  <button
                    onClick={saveCsvSelected}
                    disabled={csvLoading || csvSelected.size === 0}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
                  >
                    {csvLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden />
                    )}
                    Save {csvSelected.size} as pending
                  </button>
                </div>
                <ImportPreviewTable
                  rows={csvPreview}
                  selected={csvSelected}
                  duplicates={dupIdSet}
                  onToggle={(id) => toggle(csvSelected, setCsvSelected, id)}
                  onToggleAll={() =>
                    setCsvSelected(
                      csvSelected.size === csvPreview.length
                        ? new Set()
                        : new Set(csvPreview.map((p) => p.id))
                    )
                  }
                />
              </div>
            )}
          </section>
        )}

        {tab === "scrape" && (
          <section>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink">Scrape public supplier websites</h2>
              <p className="mt-1 text-sm text-ink-muted">
                One URL per line. The scraper respects robots.txt &amp; rate limits and never touches
                social, login, checkout or other private pages. Results are saved as pending for your
                review.
              </p>
              <textarea
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                rows={5}
                placeholder={"https://example-supplier.com\nhttps://another-supplier.com/about"}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-cyan focus:outline-none"
              />
              <button
                onClick={runScrape}
                disabled={scrapeLoading}
                className="btn-primary mt-3 inline-flex items-center gap-2 disabled:opacity-40"
              >
                {scrapeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Globe2 className="h-4 w-4" aria-hidden />
                )}
                Scrape websites
              </button>
            </div>

            {scrapeResults.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {scrapeResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                      r.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                    }`}
                  >
                    {r.ok ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : (
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{r.name ?? r.sourceUrl}</span>{" "}
                      {r.ok
                        ? `— ${r.products.length} product(s), ${r.certifications.length} cert(s), ${r.images.length} image(s)`
                        : `— blocked: ${r.blockedReason}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {scrapePreview.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-muted">{scrapeSelected.size} selected</p>
                  <button
                    onClick={saveScrapeSelected}
                    disabled={scrapeLoading || scrapeSelected.size === 0}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
                  >
                    {scrapeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden />
                    )}
                    Save {scrapeSelected.size} as pending
                  </button>
                </div>
                <ImportPreviewTable
                  rows={scrapePreview}
                  selected={scrapeSelected}
                  onToggle={(id) => toggle(scrapeSelected, setScrapeSelected, id)}
                  onToggleAll={() =>
                    setScrapeSelected(
                      scrapeSelected.size === scrapePreview.length
                        ? new Set()
                        : new Set(scrapePreview.map((p) => p.id))
                    )
                  }
                />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Review queue sub-component                                          */
/* ================================================================== */

function ReviewQueue(props: {
  visible: AdminSupplier[];
  counts: Record<string, number>;
  reviewFilter: ReviewFilter;
  setReviewFilter: (f: ReviewFilter) => void;
  refresh: () => void;
  editingId: string | null;
  draft: Draft | null;
  setDraft: (d: Draft) => void;
  setEditingId: (id: string | null) => void;
  startEdit: (s: AdminSupplier) => void;
  saveEdit: (id: string) => void;
  verify: (id: string, status: VerificationStatus) => void;
  removeSupplier: (id: string) => void;
  busyId: string | null;
}) {
  const {
    visible,
    counts,
    reviewFilter,
    setReviewFilter,
    refresh,
    editingId,
    draft,
    setDraft,
    setEditingId,
    startEdit,
    saveEdit,
    verify,
    removeSupplier,
    busyId,
  } = props;

  const countFor = (k: ReviewFilter) => (k === "all" ? counts.all : counts[k] ?? 0);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {REVIEW_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setReviewFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                reviewFilter === f.key
                  ? "bg-navy text-white"
                  : "border border-slate-200 bg-white text-ink-muted hover:border-cyan/40 hover:text-cyan"
              }`}
            >
              {f.label} ({countFor(f.key)})
            </button>
          ))}
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-cyan"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-ink-muted">
          No suppliers in this view. Import a CSV or scrape websites to populate the queue.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((s) => {
            const isEditing = editingId === s.id;
            const busy = busyId === s.id;
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  {/* Logo */}
                  <div className="shrink-0">
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.logoUrl}
                        alt={s.name}
                        className="h-16 w-16 rounded-xl border border-slate-200 object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-cyan text-lg font-bold text-white">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-ink">{s.name}</h3>
                      <VerificationBadge status={s.verificationStatus} size="sm" />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                        Trust {s.trustScore ?? "—"}/100
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {[s.category || s.industry, [s.city, s.country].filter(Boolean).join(", ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-dim">
                      {s.website && <span>🌐 {s.website}</span>}
                      {s.email && <span>✉ {s.email}</span>}
                      {s.phone && <span>☎ {s.phone}</span>}
                    </div>
                    <p className="mt-1 text-xs text-ink-dim">
                      {s.products.length} product(s) · {s.images.length} photo(s) linked ·{" "}
                      {s.certificationImages.length} cert image(s) · {s.certifications.length} cert(s)
                    </p>
                    {(() => {
                      const c = calculateSupplierCompleteness({
                        verified: s.verified,
                        website: s.website,
                        logoUrl: s.logoUrl,
                        imageUrl: s.imageUrl,
                        images: s.images,
                        products: s.products,
                        productImages: s.images,
                        description: s.description,
                        rating: s.rating,
                        reviewCount: s.reviewCount,
                        certifications: s.certifications,
                        certificationImages: s.certificationImages,
                      });
                      const warnings = completenessWarnings(s);
                      const tone =
                        c.scorePct >= 70
                          ? "bg-emerald-100 text-emerald-700"
                          : c.scorePct >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700";
                      return (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>
                              Completeness {c.scorePct}%
                            </span>
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-cyan"
                                style={{ width: `${c.scorePct}%` }}
                              />
                            </div>
                          </div>
                          {warnings.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {warnings.map((w) => (
                                <span
                                  key={w}
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                                >
                                  <AlertTriangle className="h-3 w-3" aria-hidden /> {w}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {s.sourceUrl && (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-ink-dim hover:text-cyan"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden /> source
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-col">
                    <button
                      onClick={() => verify(s.id, "verified")}
                      disabled={busy || s.verificationStatus === "verified"}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Check className="h-4 w-4" aria-hidden /> Verify
                    </button>
                    <button
                      onClick={() => verify(s.id, "needs_info")}
                      disabled={busy || s.verificationStatus === "needs_info"}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-40"
                    >
                      <HelpCircle className="h-4 w-4" aria-hidden /> Needs info
                    </button>
                    <button
                      onClick={() => verify(s.id, "rejected")}
                      disabled={busy || s.verificationStatus === "rejected"}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                    >
                      <X className="h-4 w-4" aria-hidden /> Reject
                    </button>
                    <button
                      onClick={() => (isEditing ? setEditingId(null) : startEdit(s))}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-cyan/40 hover:text-cyan disabled:opacity-40"
                    >
                      <Pencil className="h-4 w-4" aria-hidden /> {isEditing ? "Close" : "Edit"}
                    </button>
                    <button
                      onClick={() => removeSupplier(s.id)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink-muted hover:border-rose-200 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden /> Delete
                    </button>
                  </div>
                </div>

                {isEditing && draft && (
                  <EditPanel
                    draft={draft}
                    setDraft={setDraft}
                    busy={busy}
                    onSave={() => saveEdit(s.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ================================================================== */
/* Edit panel                                                          */
/* ================================================================== */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs font-semibold text-ink">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="text-xs font-semibold text-ink">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
      />
    </label>
  );
}

function EditPanel({
  draft,
  setDraft,
  busy,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  busy: boolean;
  onSave: () => void;
}) {
  const set = (k: keyof Draft) => (v: string) => setDraft({ ...draft, [k]: v });
  return (
    <div className="border-t border-slate-100 bg-slate-50/60 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" value={draft.name} onChange={set("name")} />
        <Field label="Industry" value={draft.industry} onChange={set("industry")} />
        <Field label="Category" value={draft.category} onChange={set("category")} />
        <Field label="MOQ" value={draft.moq} onChange={set("moq")} />
        <Field label="Country" value={draft.country} onChange={set("country")} />
        <Field label="City" value={draft.city} onChange={set("city")} />
        <Field label="Address" value={draft.address} onChange={set("address")} />
        <Field label="Website" value={draft.website} onChange={set("website")} placeholder="https://…" />
        <Field label="Phone" value={draft.phone} onChange={set("phone")} />
        <Field label="Email" value={draft.email} onChange={set("email")} />
        <Field label="Logo URL" value={draft.logoUrl} onChange={set("logoUrl")} placeholder="https://… logo" />
        <Field label="Banner image URL" value={draft.imageUrl} onChange={set("imageUrl")} placeholder="https://… banner" />
        <Area label="Description" value={draft.description} onChange={set("description")} />
        <Area label="Products (one per line)" value={draft.products} onChange={set("products")} />
        <Area
          label="Supplier / product image URLs (one per line)"
          value={draft.images}
          onChange={set("images")}
        />
        <Area
          label="Certification image URLs (one per line)"
          value={draft.certificationImages}
          onChange={set("certificationImages")}
        />
        <Area
          label="Certifications (one name per line)"
          value={draft.certifications}
          onChange={set("certifications")}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={onSave} disabled={busy} className="btn-primary inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save changes
        </button>
      </div>
    </div>
  );
}
