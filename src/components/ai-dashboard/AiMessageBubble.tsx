"use client";

import { motion } from "framer-motion";
import type { FakeAiResponse } from "@/components/ProcurementSuggestionCard";
import { Sparkles } from "lucide-react";

type Props = {
  response: FakeAiResponse;
  compact?: boolean;
};

function RiskBadge({ risk }: { risk: FakeAiResponse["risk"] }) {
  const styles = {
    Low: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-500/10 text-amber-700 border-amber-200",
    High: "bg-rose-500/10 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles[risk]}`}
    >
      {risk} risk
    </span>
  );
}

export default function AiMessageBubble({ response, compact }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-[92%]"
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-ai-mist/30 to-gold-pale/20 p-5 shadow-glass">
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-gold/20 to-ai-glow/15">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden />
          </span>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
              AI Procurement Insight
            </span>
            {!compact && (
              <p className="text-[11px] text-ink-dim">Powered by Suplymate Intelligence</p>
            )}
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          {response.summary}
        </p>

        {!compact && (
          <>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {[
                { label: "Supplier", value: response.recommendedSupplier },
                { label: "Est. price", value: response.estimatedPrice },
                { label: "Delivery", value: response.delivery },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-200/50 bg-white/50 px-3 py-2.5 backdrop-blur-sm"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-ink-dim">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{item.value}</p>
                </div>
              ))}
              <div className="flex items-center rounded-xl border border-slate-200/50 bg-white/50 px-3 py-2.5 backdrop-blur-sm">
                <RiskBadge risk={response.risk} />
              </div>
            </div>

            <div className="mt-4 rounded-xl border-l-2 border-gold bg-gold/5 px-4 py-3">
              <p className="text-sm text-ink-muted">
                <span className="font-semibold text-gold">Recommendation · </span>
                {response.recommendation}
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
