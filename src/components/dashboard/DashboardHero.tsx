"use client";

import { motion } from "framer-motion";
import { Sparkles, Globe2, Shield, Zap } from "lucide-react";

type Props = {
  firstName: string;
  supplierCount: number;
  conversationCount: number;
  marketStatus: string;
};

export default function DashboardHero({
  firstName,
  supplierCount,
  conversationCount,
  marketStatus,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-white/6 via-white/3 to-transparent p-6 sm:p-8"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-8 left-1/3 h-32 w-64 rounded-full bg-ai-glow/8 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-5">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative shrink-0"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/30 via-ai-glow/15 to-cyan/10 shadow-[0_0_40px_rgba(212,175,55,0.15)]">
              <Sparkles className="h-8 w-8 text-gold" aria-hidden />
            </div>
            <span className="absolute -inset-1 rounded-2xl bg-gold/10 blur-md animate-ai-pulse" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1.5 text-sm text-white/50 sm:text-base">
              Your global procurement intelligence platform.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: Globe2, text: `${supplierCount} suppliers indexed` },
                { icon: Shield, text: marketStatus },
                { icon: Zap, text: `${conversationCount} active threads` },
              ].map((chip) => (
                <span
                  key={chip.text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/55"
                >
                  <chip.icon className="h-3 w-3 text-gold/80" aria-hidden />
                  {chip.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          {[
            { label: "Market", value: "Stable", sub: "3 commodities" },
            { label: "Risk", value: "Low", sub: "Portfolio" },
            { label: "AI Score", value: "94%", sub: "Confidence" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-white/8 bg-white/5 px-3 py-3 text-center backdrop-blur-sm"
            >
              <p className="text-[10px] uppercase tracking-wider text-white/35">
                {m.label}
              </p>
              <p className="mt-0.5 text-lg font-bold text-white">{m.value}</p>
              <p className="text-[10px] text-white/35">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
