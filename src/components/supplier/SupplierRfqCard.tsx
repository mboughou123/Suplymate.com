"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Send } from "lucide-react";

type RfqItem = { id: string; productName: string; quantity: number; unit: string | null };
type Rfq = {
  id: string;
  publicRef: string | null;
  status: string;
  supplierName: string | null;
  destination: string | null;
  deadline: string | null;
  details: string | null;
  createdAt: string;
  items: RfqItem[];
  quotes: { id: string; status: string; publicRef: string | null }[];
};

type LineState = { unitPrice: string };

export default function SupplierRfqCard({ rfq }: { rfq: Rfq }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Record<string, LineState>>(
    Object.fromEntries(rfq.items.map((i) => [i.id, { unitPrice: "" }]))
  );
  const [currency, setCurrency] = useState("USD");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [incoterms, setIncoterms] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSubmittedQuote = rfq.quotes.some((q) => q.status !== "draft");

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const items = rfq.items.map((i) => ({
        rfqItemId: i.id,
        productName: i.productName,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: lines[i.id]?.unitPrice?.trim() === "" ? null : Number(lines[i.id].unitPrice),
      }));
      const res = await fetch(`/api/rfq/${rfq.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          items,
          leadTimeDays: leadTimeDays.trim() === "" ? null : Number(leadTimeDays),
          incoterms: incoterms.trim() || null,
          paymentTerms: paymentTerms.trim() || null,
          notes: notes.trim() || null,
          status: "submitted",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit quote");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit quote");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-dim">{rfq.publicRef ?? rfq.id.slice(0, 8)}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600">{rfq.status}</span>
        <span className="ml-auto text-xs text-ink-dim">{new Date(rfq.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{rfq.supplierName}</p>
      <ul className="mt-1 text-sm text-ink-muted">
        {rfq.items.map((i) => (
          <li key={i.id}>• {i.productName} — qty {i.quantity}{i.unit ? ` ${i.unit}` : ""}</li>
        ))}
      </ul>
      {(rfq.destination || rfq.deadline || rfq.details) && (
        <p className="mt-2 text-xs text-ink-dim">
          {rfq.destination ? `Destination: ${rfq.destination}. ` : ""}
          {rfq.deadline ? `Needed by: ${rfq.deadline}. ` : ""}
          {rfq.details ? `Notes: ${rfq.details}` : ""}
        </p>
      )}

      {hasSubmittedQuote ? (
        <p className="mt-3 text-xs font-medium text-emerald-700">
          Quote sent ({rfq.quotes.find((q) => q.status !== "draft")?.publicRef ?? ""}).
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-ink-muted hover:bg-slate-50"
          >
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
            {open ? "Hide quote form" : "Submit a quote"}
          </button>

          {open && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center gap-2">
                <label className="text-xs text-ink-muted">Currency</label>
                <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-dim">
                    <th className="py-1">Item</th>
                    <th className="py-1">Qty</th>
                    <th className="py-1">Unit price (leave blank if not quoting)</th>
                  </tr>
                </thead>
                <tbody>
                  {rfq.items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-1 pr-2 text-ink">{i.productName}</td>
                      <td className="py-1 pr-2 text-ink-dim">{i.quantity}</td>
                      <td className="py-1">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={lines[i.id]?.unitPrice ?? ""}
                          onChange={(e) =>
                            setLines((s) => ({ ...s, [i.id]: { unitPrice: e.target.value } }))
                          }
                          className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          placeholder="e.g. 12.50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <input value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} type="number" min="0" placeholder="Lead time (days)" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <input value={incoterms} onChange={(e) => setIncoterms(e.target.value)} placeholder="Incoterms (e.g. FOB)" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Payment terms" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              </div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes (optional)" className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan/90 disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden />
                {submitting ? "Sending…" : "Send quote"}
              </button>
              <p className="mt-2 text-[11px] text-ink-dim">
                Totals are calculated by Suplymate from your unit prices. Leave a price blank to mark
                a line &quot;Not quoted&quot;.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
