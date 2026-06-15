"use client";

import { motion } from "framer-motion";
import {
  Gauge,
  Truck,
  RotateCcw,
  CheckCircle2,
  Timer,
  ShieldCheck,
  Award,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, AnimatedBar, Sparkline, reveal } from "./primitives";

export default function TrustPerformanceSection({ profile }: { profile: SupplierProfile }) {
  const { trust, certifications } = profile;

  const metrics = [
    {
      icon: Truck,
      label: "On-time delivery",
      value: trust.onTimeDelivery,
      suffix: "%",
      color: "cyan" as const,
      data: trust.trends.onTime,
      stroke: "#0284C7",
    },
    {
      icon: CheckCircle2,
      label: "Order completion",
      value: trust.orderCompletion,
      suffix: "%",
      color: "emerald" as const,
      data: trust.trends.quality,
      stroke: "#059669",
    },
    {
      icon: RotateCcw,
      label: "Repeat buyer rate",
      value: trust.repeatBuyerRate,
      suffix: "%",
      color: "teal" as const,
      data: trust.trends.response,
      stroke: "#0D9488",
    },
    {
      icon: Timer,
      label: "Response rate",
      value: trust.responseRate,
      suffix: "%",
      color: "gold" as const,
      data: trust.trends.response,
      stroke: "#CBA351",
    },
  ];

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Performance"
        title="Trust & performance analytics"
        description="Independently scored from verified order history, buyer reviews and delivery records."
        icon={<Gauge className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.5 }}
            className="glass-card glass-hover p-5"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
                <m.icon className="h-4 w-4" aria-hidden />
              </span>
              <Sparkline data={m.data} color={m.stroke} className="h-8 w-20" />
            </div>
            <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
              {m.value}
              <span className="text-lg text-ink-dim">{m.suffix}</span>
            </p>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-dim">
              {m.label}
            </p>
            <div className="mt-3">
              <AnimatedBar value={m.value} color={m.color} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Verification + certification ribbon */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="glass-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
            Verification status
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Delivery reliability", value: trust.deliveryReliability },
              { label: "Quality consistency", value: trust.qualityConsistency },
              { label: "AI confidence", value: trust.aiConfidence },
            ].map((v) => (
              <div key={v.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">{v.label}</span>
                  <span className="font-bold text-ink">{v.value}%</span>
                </div>
                <AnimatedBar value={v.value} color="emerald" />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Award className="h-4 w-4 text-gold" aria-hidden />
            Verified certifications
          </div>
          <div className="flex flex-wrap gap-2">
            {certifications.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-ink-muted"
                title={`${c.name} · ${c.authority}`}
              >
                <ShieldCheck
                  className={`h-3.5 w-3.5 ${c.verified ? "text-emerald-600" : "text-ink-dim"}`}
                  aria-hidden
                />
                {c.code}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
