import { localeRedirect } from "@/i18n/redirect";
import { getTranslations } from "next-intl/server";
import { Check, Sparkles } from "lucide-react";
import { getCurrentAccount } from "@/lib/account";
import { PLANS, getBillingState } from "@/lib/billing";
import { ManageBillingButton, UpgradeButton } from "@/components/settings/BillingActions";

export default async function SubscriptionPage() {
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) return await localeRedirect("/login?callbackUrl=/settings/subscription");

  const t = await getTranslations("settings");
  const billing = getBillingState(user);
  const statusLabel = billing.status.charAt(0).toUpperCase() + billing.status.slice(1);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-navy p-6 text-white shadow-card">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-cyan-glow">{t("currentPlan")}</p>
            <p className="mt-2 font-display text-3xl font-bold">{billing.plan.name}</p>
            <p className="mt-1 max-w-md text-sm text-white/70">{billing.plan.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${
                  billing.trialing
                    ? "border-cyan-glow/40 bg-cyan/20 text-cyan-glow"
                    : "border-emerald-300/40 bg-emerald-400/15 text-emerald-200"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {billing.trialing ? t("trialActive") : statusLabel}
              </span>
              <span className="text-white/60">
                {billing.renewalDate ? t("renews", { date: billing.renewalDate }) : t("noRenewal")}
              </span>
            </div>
          </div>
          <ManageBillingButton configured={billing.providerConfigured} label={t("manageBilling")} />
        </div>
        {!billing.providerConfigured && (
          <p className="relative mt-5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            {t("billingUnavailable")}
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">{t("availablePlans")}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan-soft px-3 py-1 text-xs font-semibold text-cyan">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("trialNote")}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const current = plan.id === billing.plan.id;
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border bg-white p-5 shadow-card ${
                  current ? "border-cyan ring-1 ring-cyan/30" : plan.highlighted ? "border-navy/30" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">{plan.name}</h3>
                  {current && (
                    <span className="rounded-full bg-cyan-soft px-2 py-0.5 text-[10px] font-semibold text-cyan">
                      {t("yourPlan")}
                    </span>
                  )}
                </div>
                <p className="mt-2">
                  <span className="font-display text-2xl font-bold tabular-nums text-ink">{plan.priceLabel}</span>
                  <span className="text-xs text-ink-dim"> {plan.period}</span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">{plan.audience}</p>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {plan.features.slice(0, 7).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-ink-muted">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <UpgradeButton
                  plan={plan.id}
                  cta={plan.cta}
                  current={current}
                  configured={billing.providerConfigured}
                  labels={{
                    current: t("yourPlan"),
                    trial: t("startTrial"),
                    upgrade: t("upgrade"),
                    sales: t("talkToSales"),
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
