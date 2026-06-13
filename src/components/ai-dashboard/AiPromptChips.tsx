"use client";

import { motion } from "framer-motion";

export type PromptCategory = {
  label: string;
  prompts: string[];
};

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    label: "Sourcing",
    prompts: [
      "Find verified steel suppliers in China",
      "Best aluminum suppliers for California delivery",
    ],
  },
  {
    label: "Strategy",
    prompts: [
      "Should I buy copper now or wait?",
      "Compare cheapest vs fastest shipping",
    ],
  },
];

type Props = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export default function AiPromptChips({ onSelect, disabled }: Props) {
  return (
    <div className="space-y-3">
      {PROMPT_CATEGORIES.map((cat, ci) => (
        <div key={cat.label}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-dim">
            {cat.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {cat.prompts.map((prompt, pi) => (
              <motion.button
                key={prompt}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(prompt)}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.1 + pi * 0.05 }}
                className="group rounded-full border border-slate-200/80 bg-white/60 px-4 py-2 text-xs font-medium text-ink-muted backdrop-blur-sm transition hover:border-gold/40 hover:bg-gold/5 hover:text-ink hover:shadow-glass disabled:opacity-50"
              >
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ai-glow/60 transition group-hover:bg-gold" />
                {prompt}
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
