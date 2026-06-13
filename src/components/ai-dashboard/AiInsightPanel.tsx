"use client";

import { motion } from "framer-motion";
import {
  Building2,
  DollarSign,
  Truck,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Brain,
} from "lucide-react";
import type { FakeAiResponse } from "@/components/ProcurementSuggestionCard";
import { deriveInsights } from "./types";
import AiInsightCard from "./AiInsightCard";

type Props = {
  response: FakeAiResponse | null;
  source?: string;
};

export default function AiInsightPanel({ response, source }: Props) {
  const insights = response ? deriveInsights(response, source) : null;

  return (
    <aside className="ai-glass hidden w-72 shrink-0 flex-col border-l border-slate-200/60 lg:flex">
      <div className="border-b border-slate-200/60 px-5 py-4">
        <h2 className="text-sm font-bold text-ink">AI Intelligence</h2>
        <p className="text-xs text-ink-dim">Real-time procurement insights</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!response ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/10 to-ai-mist">
              <Brain className="h-7 w-7 text-gold/60" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-medium text-ink-muted">
              Insights will appear here
            </p>
            <p className="mt-1 max-w-[200px] text-xs text-ink-dim">
              Ask a sourcing question to unlock supplier intelligence
            </p>
          </motion.div>
        ) : (
          <>
            <AiInsightCard
              icon={Building2}
              label="Recommended supplier"
              value={response.recommendedSupplier}
              accent="gold"
              delay={0}
            />
            <AiInsightCard
              icon={DollarSign}
              label="Estimated cost"
              value={response.estimatedPrice}
              sub="Based on current market data"
              accent="cyan"
              delay={0.05}
            />
            <AiInsightCard
              icon={Truck}
              label="Delivery time"
              value={response.delivery}
              accent="emerald"
              delay={0.1}
            />
            <AiInsightCard
              icon={ShieldCheck}
              label="Supplier trust score"
              value={`${insights!.trustScore}%`}
              sub="Verified & rated"
              accent="emerald"
              delay={0.15}
            />
            <AiInsightCard
              icon={TrendingUp}
              label="Market trend"
              value={insights!.marketTrend}
              sub={`${insights!.trendValue > 0 ? "+" : ""}${insights!.trendValue}% this month`}
              accent="gold"
              trend={insights!.trendValue}
              delay={0.2}
            />
            <AiInsightCard
              icon={AlertTriangle}
              label="Risk analysis"
              value={response.risk}
              sub={
                response.risk === "Low"
                  ? "Safe to proceed"
                  : response.risk === "Medium"
                    ? "Review terms carefully"
                    : "Exercise caution"
              }
              accent={
                response.risk === "Low"
                  ? "emerald"
                  : response.risk === "Medium"
                    ? "amber"
                    : "rose"
              }
              delay={0.25}
            />

            {/* Confidence meter */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="ai-glass rounded-2xl border border-slate-200/50 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-ai-glow" aria-hidden />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-ink-dim">
                    AI confidence
                  </span>
                </div>
                <span className="text-lg font-bold text-ink">
                  {insights!.confidence}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${insights!.confidence}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                  className="h-full rounded-full bg-gradient-to-r from-gold via-ai-glow to-cyan"
                />
              </div>
            </motion.div>
          </>
        )}
      </div>
    </aside>
  );
}
