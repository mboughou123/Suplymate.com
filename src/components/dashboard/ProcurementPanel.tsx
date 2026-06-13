"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Send, ArrowRight, FileText, Scale, Search } from "lucide-react";

const PROMPTS = [
  "Find verified steel suppliers in China",
  "Compare cheapest vs fastest shipping",
  "Should I buy copper now?",
];

const ACTIONS = [
  { icon: FileText, label: "Generate RFQ", href: "/messages" },
  { icon: Scale, label: "Compare suppliers", href: "/products" },
  { icon: Search, label: "Source globally", href: "/suppliers" },
];

export default function ProcurementPanel() {
  const router = useRouter();
  const [input, setInput] = useState("");

  function go(query?: string) {
    const q = (query ?? input).trim();
    router.push(q ? `/ai-assistant?q=${encodeURIComponent(q)}` : "/ai-assistant");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/6 to-white/2 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">AI Procurement Assistant</h2>
            <p className="text-[11px] text-white/40">Smart sourcing & recommendations</p>
          </div>
        </div>
        <Link
          href="/ai-assistant"
          className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
        >
          Open full AI <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/55 transition hover:border-gold/25 hover:bg-gold/10 hover:text-white"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 focus-within:border-gold/30 focus-within:ring-1 focus-within:ring-gold/15">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Ask about suppliers, pricing, logistics…"
          className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        <motion.button
          type="button"
          onClick={() => go()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-light text-[#0B1220] shadow-gold"
          aria-label="Send to AI"
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/3 px-3 py-2.5 text-xs font-medium text-white/55 transition hover:border-white/12 hover:bg-white/6 hover:text-white"
          >
            <a.icon className="h-4 w-4 text-gold/70" aria-hidden />
            {a.label}
          </Link>
        ))}
      </div>
    </motion.section>
  );
}
