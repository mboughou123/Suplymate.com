"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Factory, MessageSquare, Sparkles } from "lucide-react";

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
    <section className="relative overflow-hidden rounded-2xl border border-white/70 bg-navy-gradient p-6 text-white shadow-card sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 85% 20%, rgba(14,165,183,0.35), transparent 45%)",
        }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan/90">
            Procurement workspace
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("welcome", { name: firstName })}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/75">
            {t("welcomeSubtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
              <Factory className="h-3 w-3 text-cyan" aria-hidden />
              {t("totalIndexed", { count: supplierCount })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
              <MessageSquare className="h-3 w-3 text-cyan" aria-hidden />
              {t("conversations", { count: conversationCount })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/suppliers"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
          >
            {nav("suppliers")}
          </Link>
          <Link
            href="/ai-assistant"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink transition hover:bg-gold-light"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {nav("aiAssistant")}
          </Link>
        </div>
      </div>
    </section>
  );
}
