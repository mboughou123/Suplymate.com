"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Clock } from "lucide-react";
import { EARLY_BIRD, PLANS, TRIAL_DAYS, type BillingInterval } from "@/lib/billing";
import PlanCta from "@/components/pricing/PlanCta";
import PlanPrice from "@/components/pricing/PlanPrice";
import BillingIntervalToggle from "@/components/pricing/BillingIntervalToggle";
import Beam from "@/components/fx/Beam";

export default function PricingPlansGrid({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("pricing");
  const [interval, setBillingInterval] = useState<BillingInterval>("month");

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <BillingIntervalToggle value={interval} onChange={setBillingInterval} />
        <p className="inline-flex max-w-2xl items-start gap-2 rounded-xl border border-cyan/20 bg-cyan-soft px-4 py-2.5 text-left text-sm text-navy">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden />
          <span>
            <strong className="font-semibold">{t("earlyBirdTitle")}</strong>{" "}
            {t("earlyBirdBody", {
              percent: EARLY_BIRD.percentOff,
              months: EARLY_BIRD.durationMonths,
              spots: EARLY_BIRD.maxRedemptions,
            })}
          </span>
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const card = (
            <article
              className={`flex h-full flex-col rounded-2xl border bg-white p-6 shadow-card ${
                plan.highlighted ? "border-navy/40" : "border-slate-200"
              }`}
            >
              <div className="flex min-h-7 items-center justify-between gap-2">
                <h2 className="text-heading-sm text-ink">{plan.name}</h2>
                {plan.highlighted && (
                  <span className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    {t("mostPopular")}
                  </span>
                )}
              </div>
              <p className="mt-1 min-h-10 text-sm text-ink-muted">{plan.audience}</p>
              <div className="mt-4">
                <PlanPrice plan={plan} interval={interval} />
              </div>
              <p className="mt-2 h-4 text-xs font-semibold text-cyan">
                {plan.trialDays > 0 ? t("trialLine", { days: TRIAL_DAYS }) : ""}
              </p>
              <p className="mt-3 min-h-12 text-sm leading-relaxed text-ink-muted">{plan.description}</p>
              <ul className="mt-5 flex-1 space-y-2 border-t border-slate-100 pt-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <PlanCta
                  plan={plan.id}
                  cta={plan.cta}
                  signedIn={signedIn}
                  interval={interval}
                  labels={{
                    free: t("ctaFree"),
                    trial: t("ctaTrial"),
                    sales: t("ctaSales"),
                    subscribe: t("ctaSubscribe"),
                  }}
                />
              </div>
            </article>
          );
          return plan.highlighted ? (
            <Beam key={plan.id} size="md" colorVariant="ocean" strength={0.55} theme="light" className="h-full">
              {card}
            </Beam>
          ) : (
            <div key={plan.id} className="h-full">
              {card}
            </div>
          );
        })}
      </div>
    </>
  );
}
