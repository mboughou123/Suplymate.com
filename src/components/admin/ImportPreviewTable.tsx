"use client";

import { Globe, Mail, Phone, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import type { AdminSupplier } from "@/lib/supplier-normalize";

type Props = {
  rows: AdminSupplier[];
  selected: Set<string>;
  /** Candidate ids flagged as duplicates of an existing record. */
  duplicates?: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onRemove?: (id: string) => void;
};

function trustTone(score: number | null): string {
  if (score == null) return "text-ink-dim";
  if (score >= 70) return "text-emerald-700";
  if (score >= 45) return "text-amber-700";
  return "text-rose-700";
}

/**
 * Presentational preview table for CSV / scrape import flows. Lets the admin
 * select which previewed suppliers to save and flags detected duplicates.
 */
export default function ImportPreviewTable({
  rows,
  selected,
  duplicates,
  onToggle,
  onToggleAll,
  onRemove,
}: Props) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-ink-muted">
        No rows to preview.
      </p>
    );
  }

  const allSelected = rows.every((r) => selected.has(r.id));

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-ink-dim">
          <tr>
            <th className="px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all"
                className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
              />
            </th>
            <th className="px-4 py-3">Supplier</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Trust</th>
            <th className="px-4 py-3">Status</th>
            {onRemove && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const isDup = duplicates?.has(r.id);
            return (
              <tr key={r.id} className={isDup ? "bg-amber-50/40" : undefined}>
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => onToggle(r.id)}
                    aria-label={`Select ${r.name}`}
                    className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="font-semibold text-ink">{r.name || "—"}</div>
                  <div className="text-xs text-ink-dim">
                    {r.category || r.industry}
                    {r.products.length > 0 && ` · ${r.products.length} product(s)`}
                  </div>
                  {isDup && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      <AlertTriangle className="h-3 w-3" aria-hidden /> Possible duplicate
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-ink-muted">
                  {[r.city, r.country].filter(Boolean).join(", ") || r.location || "—"}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-0.5 text-xs text-ink-muted">
                    {r.website && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Globe className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="max-w-[180px] truncate">{r.website}</span>
                      </span>
                    )}
                    {r.email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" aria-hidden /> {r.email}
                      </span>
                    )}
                    {r.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" aria-hidden /> {r.phone}
                      </span>
                    )}
                    {!r.website && !r.email && !r.phone && <span>—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={`inline-flex items-center gap-1 font-bold ${trustTone(r.trustScore)}`}>
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                    {r.trustScore ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    pending
                  </span>
                </td>
                {onRemove && (
                  <td className="px-4 py-3 align-top">
                    <button
                      onClick={() => onRemove(r.id)}
                      className="text-ink-dim transition hover:text-rose-600"
                      aria-label={`Remove ${r.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
