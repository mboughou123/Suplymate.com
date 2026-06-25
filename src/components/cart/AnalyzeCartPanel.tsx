"use client";

import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";

type Analysis = {
  summary: string;
  supplierNotes: { supplierId: string; supplierName: string; notes: string }[];
  questionsForBuyer: string[];
  disclaimers: string[];
  source: "openai" | "demo";
};

type Props = {
  destination: string;
  deadline: string;
  note: string;
  disabled?: boolean;
};

export default function AnalyzeCartPanel({ destination, deadline, note, disabled }: Props) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setApproved(false);
    try {
      const res = await fetch("/api/cart/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, deadline, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data.analysis as Analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <Bot className="h-5 w-5 text-cyan" aria-hidden />
        Analyze my cart
      </h2>
      <p className="mt-1 text-xs text-ink-dim">
        AI suggestions based on your cart contents only. Review everything — AI never submits RFQs for you.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={disabled || loading}
        className="mt-3 w-full rounded-lg border border-cyan/40 bg-cyan/5 px-4 py-2 text-sm font-semibold text-cyan hover:bg-cyan/10 disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analyzing…
          </span>
        ) : (
          "Run analysis"
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {analysis && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-ink">{analysis.summary}</p>
          {analysis.supplierNotes.length > 0 && (
            <ul className="space-y-2">
              {analysis.supplierNotes.map((s) => (
                <li key={s.supplierId} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-ink">{s.supplierName}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{s.notes}</p>
                </li>
              ))}
            </ul>
          )}
          {analysis.questionsForBuyer.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-ink-dim">Questions to clarify</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-ink-muted">
                {analysis.questionsForBuyer.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          <ul className="text-[11px] text-ink-dim">
            {analysis.disclaimers.map((d) => (
              <li key={d}>• {d}</li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-dim">
            Source: {analysis.source === "openai" ? "OpenAI (grounded on cart data)" : "Built-in guidance (no API key)"}
          </p>
          <label className="flex items-start gap-2 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              className="mt-0.5"
            />
            I have reviewed this analysis and understand it is advisory only.
          </label>
        </div>
      )}
    </div>
  );
}