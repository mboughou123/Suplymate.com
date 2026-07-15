"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sparkles, Factory, MessageSquare } from "lucide-react";

type Props = {
  firstName: string;
  supplierCount: number;
  conversationCount: number;
};

export default function DashboardHero({
  firstName,
  supplierCount,
  conversationCount,
}: Props) {
  const t = useTranslations("dashboard");
  const nav = useTranslations("navigation");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("welcome", { name: firstName })}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">{t("welcomeSubtitle")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-ink-muted">
              <Factory className="h-3 w-3 text-gold" aria-hidden />
              {t("totalIndexed", { count: supplierCount })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-ink-muted">
              <MessageSquare className="h-3 w-3 text-gold" aria-hidden />
              {t("conversations", { count: conversationCount })}
            </span>
          </div>
        </div>

        <Link
          href="/ai-assistant"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink transition hover:bg-gold-light"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {nav("aiAssistant")}
        </Link>
      </div>
    </section>
  );
}
