"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

const PROMPT_KEYS = ["prompt1", "prompt2", "prompt3"] as const;

/** Compact "ask Mate" launcher: suggested prompts + a free-text box → /ai-assistant. */
export default function MateQuickAsk() {
  const t = useTranslations("dashboard.mate");
  const router = useRouter();
  const [input, setInput] = useState("");

  function go(query?: string) {
    const q = (query ?? input).trim();
    router.push(q ? `/ai-assistant?q=${encodeURIComponent(q)}` : "/ai-assistant");
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-navy/60 bg-navy p-5 text-white shadow-cardHover sm:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-glow/25 blur-[80px]" />
        <div className="absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-cyan/30 blur-[70px]" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-glow">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="eyebrow text-cyan-glow">{t("eyebrow")}</p>
              <h2 className="mt-0.5 font-display text-heading-sm text-white">{t("title")}</h2>
            </div>
          </div>
          <Link
            href="/ai-assistant"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-white/70 transition hover:text-white"
          >
            {t("open")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-white/70">{t("body")}</p>

        <ul className="mt-4 space-y-2">
          {PROMPT_KEYS.map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => go(t(key))}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-left text-sm text-white/85 transition hover:border-cyan-glow/40 hover:bg-white/10 hover:text-white"
              >
                <span className="min-w-0 truncate">{t(key)}</span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-cyan-glow opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] p-1.5 focus-within:border-cyan-glow/50 focus-within:ring-2 focus-within:ring-cyan-glow/20"
        >
          <label htmlFor="mate-quick-ask" className="sr-only">
            {t("inputLabel")}
          </label>
          <input
            id="mate-quick-ask"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-white placeholder:text-white/45 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-cyan px-3 text-xs font-semibold text-white shadow-glow transition hover:bg-[#075985]"
          >
            {t("ask")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}
