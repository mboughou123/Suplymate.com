export type FakeAiResponse = {
  recommendedSupplier: string;
  estimatedPrice: string;
  delivery: string;
  risk: "Low" | "Medium" | "High";
  recommendation: string;
  summary: string;
};

type ProcurementSuggestionCardProps = {
  response: FakeAiResponse;
};

function RiskBadge({ risk }: { risk: FakeAiResponse["risk"] }) {
  const styles = {
    Low: "bg-emerald-100 text-emerald-800",
    Medium: "bg-amber-100 text-amber-800",
    High: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[risk]}`}>
      Risk: {risk}
    </span>
  );
}

export default function ProcurementSuggestionCard({
  response,
}: ProcurementSuggestionCardProps) {
  return (
    <div className="rounded-2xl border border-mustard/30 bg-gradient-to-br from-mustard-pale/80 to-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-sm text-white">
          AI
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
          Procurement recommendation
        </span>
      </div>

      <p className="mt-4 text-sm text-ink-muted leading-relaxed">{response.summary}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/80 p-3 border border-slate-200">
          <p className="text-xs text-ink-dim">Recommended supplier</p>
          <p className="mt-1 font-semibold text-ink">
            {response.recommendedSupplier}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 border border-slate-200">
          <p className="text-xs text-ink-dim">Estimated price</p>
          <p className="mt-1 font-semibold text-ink">{response.estimatedPrice}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 border border-slate-200">
          <p className="text-xs text-ink-dim">Delivery</p>
          <p className="mt-1 font-semibold text-ink">{response.delivery}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 border border-slate-200 flex items-center">
          <RiskBadge risk={response.risk} />
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-navy/5 px-4 py-3 text-sm font-medium text-ink border-l-4 border-mustard">
        <span className="text-mustard font-semibold">Recommendation: </span>
        {response.recommendation}
      </p>
    </div>
  );
}
