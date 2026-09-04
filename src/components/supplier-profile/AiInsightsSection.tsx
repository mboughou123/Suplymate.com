"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Brain,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Target,
  Globe2,
  Handshake,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { Sparkline } from "./primitives";

const TONE: Record<string, string> = {
  positive: "text-emerald-700",
  neutral: "text-cyan",
  watch: "text-cyan",
};

export default function AiInsightsSection({ profile }: { profile: SupplierProfile }) {
  const t = useTranslations("supplierProfile");
  const { ai, base } = profile;

  return (
    <section className="border-y border-slate-100/80 bg-white">
      <div className="container-page section-y-tight">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-start gap-3"
        >
          <span className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/5 text-cyan">
            <Brain className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="eyebrow text-cyan">{t("aiEyebrow")}</p>
            <h2 className="mt-1 font-display text-heading-lg text-ink">
              {t("aiProcurementTitle")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              {t("aiProcurementSubtitle", { confidence: ai.overallConfidence })}
            </p>
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card p-6"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan">
              <Sparkles className="h-4 w-4" aria-hidden /> {t("supplierAnalysis")}
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{ai.analysis}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="glass-card p-6"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan">
              <ShieldAlert className="h-4 w-4" aria-hidden /> {t("riskAnalysis")}
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{ai.riskAnalysis}</p>
          </motion.div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ai.cards.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="glass-card glass-hover p-5"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${TONE[c.tone]}`}>{c.confidence}%</span>
                <span className="text-[10px] uppercase tracking-wider text-ink-dim">
                  {t("confidence")}
                </span>
              </div>
              <div className="my-3">
                <Sparkline data={c.trend} color="#0369A1" className="h-10 w-full" />
              </div>
              <p className="font-display text-sm font-semibold text-ink">{c.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{c.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <RecoCard
            icon={Target}
            title={t("sourcingRecommendations")}
            items={ai.sourcingRecommendations}
            accent="text-cyan"
          />
          <RecoCard
            icon={Handshake}
            title={t("negotiationInsights")}
            items={ai.negotiationInsights}
            accent="text-navy"
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card p-6"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-teal">
              <Globe2 className="h-4 w-4" aria-hidden /> {t("bestFitMarkets")}
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {ai.bestMarkets.map((m) => (
                <span
                  key={m}
                  className="rounded-xl bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan"
                >
                  {m}
                </span>
              ))}
            </div>
            <div className="space-y-2 text-xs text-ink-muted">
              <Stat label={t("pricingCompetitiveness")} value={`${ai.pricingCompetitiveness}%`} />
              <Stat
                label={t("deliveryReliabilityForecast")}
                value={`${ai.deliveryReliabilityPrediction}%`}
              />
              <div className="flex items-center gap-2 pt-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                <span>{t("demandTrend", { category: base.categoryLabel.toLowerCase() })}</span>
                <span className="ml-auto w-20">
                  <Sparkline data={ai.demandTrend} color="#047857" className="h-6 w-full" fill={false} />
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function RecoCard({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: typeof Target;
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6"
    >
      <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${accent}`}>
        <Icon className="h-4 w-4" aria-hidden /> {title}
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink-muted">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${accent}`} />
            {it}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}
