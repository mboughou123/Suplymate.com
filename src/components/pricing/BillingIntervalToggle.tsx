"use client";

import { useTranslations } from "next-intl";
import { ANNUAL_DISCOUNT_PERCENT, BILLING_INTERVALS, type BillingInterval } from "@/lib/billing";

type Props = {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
  tone?: "light" | "dark";
};

export default function BillingIntervalToggle({ value, onChange, tone = "light" }: Props) {
  const t = useTranslations("pricing");
  const shell =
    tone === "dark" ? "border-white/15 bg-white/5" : "border-slate-200 bg-white shadow-card";
  return (
    <div role="radiogroup" aria-label={t("billingPeriod")} className={`inline-flex rounded-full border p-1 ${shell}`}>
      {BILLING_INTERVALS.map((interval) => {
        const active = interval === value;
        const idle = tone === "dark" ? "text-white/70 hover:text-white" : "text-ink-muted hover:text-ink";
        return (
          <button
            key={interval}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(interval)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              active ? "bg-navy text-white" : idle
            }`}
          >
            {interval === "month" ? t("billingMonthly") : t("billingAnnual")}
            {interval === "year" && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  active ? "bg-cyan-glow text-navy-deep" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {t("saveBadge", { percent: ANNUAL_DISCOUNT_PERCENT })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
