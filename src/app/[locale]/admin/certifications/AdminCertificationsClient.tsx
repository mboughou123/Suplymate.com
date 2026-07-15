"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  Plus,
  Loader2,
  Save,
  Trash2,
  Images,
  ExternalLink,
  Info,
} from "lucide-react";
import MediaManagerModal from "@/components/admin/media/MediaManagerModal";
import { CERT_STATUSES, type Certification, type CertStatus } from "@/lib/certifications-store";

type SupplierOpt = { id: string; name: string };

type Props = {
  suppliers: SupplierOpt[];
  initialCertifications: Certification[];
  initialSupplierId: string;
};

const STATUS_STYLE: Record<CertStatus, string> = {
  claimed: "bg-slate-100 text-slate-600",
  pending: "bg-amber-50 text-amber-700",
  reviewed: "bg-sky-50 text-sky-700",
  verified: "bg-emerald-50 text-emerald-700",
  expired: "bg-orange-50 text-orange-700",
  rejected: "bg-rose-50 text-rose-700",
};

const EMPTY_DRAFT = {
  name: "",
  type: "",
  issuingOrg: "",
  certificateNumber: "",
  issueDate: "",
  expirationDate: "",
  verificationUrl: "",
  sourceUrl: "",
  notes: "",
  status: "claimed" as CertStatus,
};

export default function AdminCertificationsClient({
  suppliers,
  initialCertifications,
  initialSupplierId,
}: Props) {
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [certs, setCerts] = useState<Certification[]>(initialCertifications);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaForCert, setMediaForCert] = useState<Certification | null>(null);

  const visible = useMemo(
    () => (supplierId ? certs.filter((c) => c.supplierId === supplierId) : certs),
    [certs, supplierId]
  );

  async function reloadFor(sid: string) {
    setSupplierId(sid);
    setError(null);
    try {
      const url = sid ? `/api/admin/certifications?supplierId=${encodeURIComponent(sid)}` : "/api/admin/certifications";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setCerts(data.certifications);
    } catch {
      setError("Could not load certifications.");
    }
  }

  async function addCert() {
    if (!supplierId) {
      setError("Pick a supplier first.");
      return;
    }
    if (!draft.name.trim()) {
      setError("Certification name is required.");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, ...draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not add certification.");
        return;
      }
      setCerts((prev) => [data.certification, ...prev]);
      setDraft({ ...EMPTY_DRAFT });
    } catch {
      setError("Network error.");
    } finally {
      setAdding(false);
    }
  }

  async function patchCert(id: string, patch: Partial<Certification>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/certifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) setCerts((prev) => prev.map((c) => (c.id === id ? data.certification : c)));
      else setError(data?.error ?? "Update failed.");
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeCert(id: string) {
    if (!confirm("Delete this certification? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/certifications/${id}`, { method: "DELETE" });
      if (res.ok) setCerts((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="border-b border-slate-200 bg-gradient-to-br from-navy-dark to-navy py-10 text-white">
        <div className="container-page">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Admin
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Certifications</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Manage supplier certifications and their certificate images. A certificate is never
            auto-verified because an image exists — set the verification status manually.
          </p>
        </div>
      </div>

      <div className="container-page py-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={supplierId}
            onChange={(e) => reloadFor(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Public profiles show: <em>&quot;Certification displayed by the supplier. Verification status:
            [status].&quot;</em> The Suplymate verified badge is shown only when you set status to{" "}
            <strong>verified</strong>.
          </p>
        </div>

        {/* Add form */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-ink">Add certification</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Name *" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="ISO 9001" />
            <Input label="Type" value={draft.type} onChange={(v) => setDraft({ ...draft, type: v })} placeholder="ISO / CE / audit" />
            <Input label="Issuing organisation" value={draft.issuingOrg} onChange={(v) => setDraft({ ...draft, issuingOrg: v })} placeholder="Bureau Veritas" />
            <Input label="Certificate number" value={draft.certificateNumber} onChange={(v) => setDraft({ ...draft, certificateNumber: v })} />
            <Input label="Issue date" type="date" value={draft.issueDate} onChange={(v) => setDraft({ ...draft, issueDate: v })} />
            <Input label="Expiration date" type="date" value={draft.expirationDate} onChange={(v) => setDraft({ ...draft, expirationDate: v })} />
            <Input label="Verification URL" value={draft.verificationUrl} onChange={(v) => setDraft({ ...draft, verificationUrl: v })} />
            <Input label="Source URL" value={draft.sourceUrl} onChange={(v) => setDraft({ ...draft, sourceUrl: v })} />
            <label className="text-xs font-semibold text-ink">
              Status
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as CertStatus })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
              >
                {CERT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-ink sm:col-span-2 lg:col-span-3">
              Notes
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
              />
            </label>
          </div>
          {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <button onClick={addCert} disabled={adding} className="btn-primary mt-3 inline-flex items-center gap-1.5 disabled:opacity-40">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add certification
          </button>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-ink-muted">
            No certifications {supplierId ? "for this supplier" : "yet"}.
          </p>
        ) : (
          <div className="space-y-3">
            {visible.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-ink">{c.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                      {c.type && <span className="text-xs text-ink-dim">{c.type}</span>}
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {c.issuingOrg ? `${c.issuingOrg} · ` : ""}
                      {c.certificateNumber ? `#${c.certificateNumber} · ` : ""}
                      {c.issueDate ? `Issued ${c.issueDate.slice(0, 10)} ` : ""}
                      {c.expirationDate ? `· Expires ${c.expirationDate.slice(0, 10)}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {c.verificationUrl && (
                        <a href={c.verificationUrl} target="_blank" rel="noreferrer noopener nofollow" className="inline-flex items-center gap-1 text-cyan hover:underline">
                          <ExternalLink className="h-3 w-3" /> Verification
                        </a>
                      )}
                      {c.sourceUrl && (
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener nofollow" className="inline-flex items-center gap-1 text-ink-dim hover:text-cyan">
                          <ExternalLink className="h-3 w-3" /> Source
                        </a>
                      )}
                    </div>
                    {c.notes && <p className="mt-1 text-xs text-ink-dim">{c.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="text-xs font-semibold text-ink">
                      <span className="sr-only">Status</span>
                      <select
                        value={c.status}
                        onChange={(e) => patchCert(c.id, { status: e.target.value as CertStatus })}
                        disabled={busyId === c.id}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none"
                      >
                        {CERT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      onClick={() => setMediaForCert(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink hover:border-cyan/40 hover:text-cyan"
                    >
                      <Images className="h-3.5 w-3.5" /> Image
                    </button>
                    <button
                      onClick={() => removeCert(c.id)}
                      disabled={busyId === c.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-rose-200 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {mediaForCert && (
        <MediaManagerModal
          entityType="CERTIFICATION"
          entityId={mediaForCert.id}
          allowedTypes={["CERTIFICATION"]}
          defaultType="CERTIFICATION"
          title={`Certificate image · ${mediaForCert.name}`}
          description="Upload or replace the certificate document/image. Publishing it makes it visible in the supplier's certification gallery — this does NOT verify the certificate."
          onClose={() => setMediaForCert(null)}
        />
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="text-xs font-semibold text-ink">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-cyan focus:outline-none"
      />
    </label>
  );
}
