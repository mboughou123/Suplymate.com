"use client";

import { motion } from "framer-motion";
import { Sparkles, Globe2, Shield, Zap } from "lucide-react";

const FEATURES = [
  { icon: Globe2, label: "Global supplier matching" },
  { icon: Shield, label: "Trust & risk analysis" },
  { icon: Zap, label: "Real-time market intelligence" },
];

export default function AiWelcomeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative mb-6"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-gold/25 via-ai-glow/15 to-cyan/10 shadow-ai-glow">
          <Sparkles className="h-9 w-9 text-gold" aria-hidden />
        </div>
        <span className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-gold/20 to-ai-glow/10 blur-xl animate-ai-pulse" />
      </motion.div>

      <h2 className="max-w-md text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Describe what you need to source globally.
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">
        Get supplier recommendations, pricing intelligence, delivery analysis,
        and procurement strategies — powered by AI.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
            className="ai-glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-ink-muted"
          >
            <f.icon className="h-3.5 w-3.5 text-gold" aria-hidden />
            {f.label}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
