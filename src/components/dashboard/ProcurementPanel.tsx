"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Sparkles, Send, ArrowRight, FileText, Scale, Search } from "lucide-react";

export default function ProcurementPanel() {
  const t = useTranslations("aiAssistant");
  const nav = useTranslations("navigation");
  const common = useTranslations("common");
  const router = useRouter();
  const [input, setInput] = useState("");

  const ACTIONS = [
    { icon: FileText, label: nav("messages"), href: "/messages" },
    { icon: Scale, label: common("compare"), href: "/products" },
    { icon: Search, label: nav("suppliers"), href: "/suppliers" },
  ];

  function go(query?: string) {
    const q = (query ?? input).trim();
    router.push(q ? `/ai-assistant?q=${encodeURIComponent(q)}` : "/ai-assistant");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">{t("title")}</h2>
            <p className="text-[11px] text-ink-dim">{t("subtitle")}</p>
          </div>
        </div>
        <Link
          href="/ai-assistant"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition hover:text-gold"
        >
          {common("explore")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => go(t("capabilityAiMatchingText"))}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-muted transition hover:border-gold/40 hover:bg-gold/5 hover:text-ink"
        >
          {t("capabilityAiMatching")}
        </button>
        <button
          type="button"
          onClick={() => go(t("capabilityPriceTrackingText"))}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-muted transition hover:border-gold/40 hover:bg-gold/5 hover:text-ink"
        >
          {t("capabilityPriceTracking")}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-gold/50 focus-within:ring-2 focus-within:ring-gold/15">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder={t("description")}
          className="flex-1 bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-dim focus:outline-none"
        />
        <button
          type="button"
          onClick={() => go()}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-ink transition hover:bg-gold-light"
          aria-label={t("tryAssistant")}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-ink-muted transition hover:border-gold/40 hover:bg-gold/5 hover:text-ink"
          >
            <a.icon className="h-4 w-4 text-gold" aria-hidden />
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
