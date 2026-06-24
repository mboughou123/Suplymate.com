"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/quotes";
import { Info } from "lucide-react";

type QuoteItem = {
  id: string;
  rfqItemId: string | null;
  productName: string;
  quantity: number;
  unit: string | null;
  unitPrice: number | null;
  lineTotal: number | null;
  note: string | null;
};

type Quote = {
  id: string;
  publicRef: string | null;
  status: string;
  currency: string;
  subtotal: number | null;
  leadTimeDays: number | null;
  incoterms: string | null;
  paymentTerms: string | null;
  shippingCostLabel: string | null;
  validUntil: string | null;
  notes: string | null;
  items: QuoteItem[];
};

type Rfq = {
  id: string;
  publicRef: string | null;
  status: string;
  items: { id: string; productName: string; quantity: number; unit: string | null }[];
  quotes: Quote[];
};

type SortKey = "received" | "subtotal" | "leadTime";

export default function QuoteComparison({ rfq }: { rfq: Rfq }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("received");
  const [busy, setBusy] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const quotes = [...rfq.quotes];
    if (sortKey === "subtotal") {
      // Quotes without a subtotal (no prices quoted) sort last.
      quotes.sort((a, b) => {
        if (a.subtotal == null && b.subtotal == null) return 0;
        if (a.subtotal == null) return 1;
        if (b.subtotal == null) return -1;
        return a.subtotal - b.subtotal;
      });
    } else if (sortKey === "leadTime") {
      quotes.sort((a, b) => {
        if (a.leadTimeDays == null && b.leadTimeDays == null) return 0;
        if (a.leadTimeDays == null) return 1;
        if (b.leadTimeDays == null) return -1;
        return a.leadTimeDays - b.leadTimeDays;
      });
    }
    return quotes;
  }, [rfq.quotes, sortKey]);

  // Factual marker only (NOT a recommendation): the lowest quoted subtotal.
  const lowestSubtotal = useMemo(() => {
    const priced = rfq.quotes.filter((q) => q.subtotal != null) as (Quote & { subtotal: number })[];
    if (priced.length < 2) return null;
    return Math.min(...priced.map((q) => q.subtotal));
  }, [rfq.quotes]);

  const act = async (quoteId: string, action: "accept" | "decline") => {
    setBusy(quoteId + action);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  };

  if (rfq.quotes.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="font-display text-lg font-bold text-ink">Quotes</h2>
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-ink-muted">
          No quotes yet. You&apos;ll be notified when the supplier responds.
        </div>
        <ProvenanceLegend />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">
          Compare quotes ({rfq.quotes.length})
        </h2>
        <label className="text-sm text-ink-muted">
          Sort by{" "}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="received">Most recent</option>
            <option value="subtotal">Quoted subtotal (low→high)</option>
            <option value="leadTime">Lead time (low→high)</option>
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-4 font-medium text-ink-dim">Line item</th>
              {sorted.map((q) => (
                <th key={q.id} className="px-3 py-2 align-bottom">
                  <div className="font-mono text-xs text-ink-dim">{q.publicRef ?? q.id.slice(0, 6)}</div>
                  <div className="text-sm font-semibold text-ink capitalize">{q.status}</div>
                  {lowestSubtotal != null && q.subtotal === lowestSubtotal && (
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      Lowest quoted subtotal
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rfq.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <div className="font-medium text-ink">{item.productName}</div>
                  <div className="text-xs text-ink-dim">
                    qty {item.quantity}
                    {item.unit ? ` ${item.unit}` : ""}
                  </div>
                </td>
                {sorted.map((q) => {
                  const line = q.items.find((l) => l.rfqItemId === item.id);
                  return (
                    <td key={q.id} className="px-3 py-2 align-top">
                      {line ? (
                        line.unitPrice != null ? (
                          <>
                            <div className="text-ink">{formatMoney(line.unitPrice, q.currency)}<span className="text-xs text-ink-dim"> /unit</span></div>
                            <div className="text-xs text-ink-dim">= {formatMoney(line.lineTotal, q.currency)}</div>
                          </>
                        ) : (
                          <span className="text-xs text-ink-dim">Not quoted</span>
                        )
                      ) : (
                        <span className="text-xs text-ink-dim">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-b border-slate-200 bg-slate-50/60">
              <td className="py-2 pr-4 font-semibold text-ink">Subtotal <span className="text-[11px] font-normal text-ink-dim">(Suplymate-calculated)</span></td>
              {sorted.map((q) => (
                <td key={q.id} className="px-3 py-2 font-semibold text-ink">
                  {q.subtotal != null ? formatMoney(q.subtotal, q.currency) : <span className="text-xs font-normal text-ink-dim">Not quoted</span>}
                </td>
              ))}
            </tr>
            {([
              ["Lead time", (q: Quote) => (q.leadTimeDays != null ? `${q.leadTimeDays} days` : null)],
              ["Incoterms", (q: Quote) => q.incoterms],
              ["Payment terms", (q: Quote) => q.paymentTerms],
              ["Shipping", (q: Quote) => q.shippingCostLabel],
              ["Valid until", (q: Quote) => (q.validUntil ? new Date(q.validUntil).toLocaleDateString() : null)],
            ] as const).map(([label, get]) => (
              <tr key={label} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-ink-muted">{label} <span className="text-[11px] text-ink-dim">(Supplier-provided)</span></td>
                {sorted.map((q) => (
                  <td key={q.id} className="px-3 py-2 text-ink">
                    {get(q) ?? <span className="text-xs text-ink-dim">Not provided</span>}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="py-3 pr-4" />
              {sorted.map((q) => (
                <td key={q.id} className="px-3 py-3 align-top">
                  {q.status === "accepted" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Accepted</span>
                  ) : q.status === "declined" ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">Declined</span>
                  ) : q.status === "withdrawn" ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">Withdrawn</span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => act(q.id, "accept")}
                        disabled={busy !== null}
                        className="rounded-lg bg-cyan px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan/90 disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => act(q.id, "decline")}
                        disabled={busy !== null}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-ink-muted hover:bg-slate-50 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <ProvenanceLegend />
    </div>
  );
}

function ProvenanceLegend() {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-ink-dim">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Unit prices and terms are <strong>supplier-provided</strong>. Subtotals are{" "}
        <strong>Suplymate-calculated</strong> from the supplier&apos;s unit prices × your quantities.
        &quot;Not quoted&quot; means the supplier did not provide a price for that line. Accepting a
        quote does not create a binding order or take payment — arrange final terms directly with the
        supplier.
      </span>
    </p>
  );
}
