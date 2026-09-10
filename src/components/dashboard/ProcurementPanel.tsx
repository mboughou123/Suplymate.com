"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowRight,
  Binoculars,
  FileText,
  GitCompareArrows,
  Radar,
} from "lucide-react";
import AIPrompt, {
  type SuplymateAgent,
} from "@/components/kokonutui/ai-prompt";
import AILoadingState from "@/components/kokonutui/ai-loading-state";
import AITextLoading from "@/components/kokonutui/ai-text-loading";

export default function ProcurementPanel() {
  const t = useTranslations("aiAssistant");
  const nav = useTranslations("navigation");
  const common = useTranslations("common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const ACTIONS = [
    {
      icon: Radar,
      label: "Scout",
      href: "/suppliers",
      hint: nav("suppliers"),
    },
    {
      icon: GitCompareArrows,
      label: "Compare",
      href: "/products",
      hint: common("compare"),
    },
    {
      icon: Binoculars,
      label: "Watch",
      href: "/price-charts",
      hint: nav("priceCharts"),
    },
    {
      icon: FileText,
      label: "RFQ",
      href: "/messages",
      hint: nav("messages"),
    },
  ];

  function go(query: string, agent: SuplymateAgent) {
    setBusy(true);
    const q = query.trim();
    const base = "/ai-assistant";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("agent", agent.toLowerCase());
    // Brief loading state so the agent console feels intentional, then navigate.
    window.setTimeout(() => {
      router.push(`${base}?${params.toString()}`);
    }, 700);
  }

  return (
    <section className="panel-glass overflow-hidden p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan">
            Scout · Compare · Watch
          </p>
          <h2 className="mt-1 text-sm font-bold text-ink">{t("title")}</h2>
          <p className="text-[11px] text-ink-dim">{t("subtitle")}</p>
        </div>
        <Link
          href="/ai-assistant"
          className="inline-flex items-center gap-1 text-xs font-semibold text-navy transition hover:text-cyan"
        >
          {common("explore")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4">
        {busy ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <AITextLoading
              texts={[
                "Scanning supplier directories…",
                "Matching specs…",
                "Comparing quotes…",
              ]}
            />
            <AILoadingState className="mt-2" />
          </div>
        ) : (
          <AIPrompt
            onSubmit={go}
            headerText="Mate — agents ready for your next RFQ"
            headerAction="Open assistant"
            placeholder="Ask Scout to find mills, Compare quotes, or Watch a price…"
          />
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-xs font-medium text-ink-muted transition hover:border-cyan/40 hover:bg-cyan/5 hover:text-ink"
          >
            <a.icon className="h-4 w-4 text-cyan" aria-hidden />
            <span>
              <span className="block font-semibold text-ink">{a.label}</span>
              <span className="block text-[10px] text-ink-dim">{a.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
