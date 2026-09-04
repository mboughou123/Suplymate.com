import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Check, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { PLANS, isBillingProviderConfigured, TRIAL_DAYS } from "@/lib/billing";
import PlanCta from "@/components/pricing/PlanCta";
import Beam from "@/components/fx/Beam";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("pricingTitle"),
    description: t("pricingDescription"),
  };
}

const COMPARE_ROWS: { label: string; free: string; basic: string; premium: string; enterprise: string }[] = [
  { label: "Supplier browsing", free: "Limited searches", basic: "Unlimited", premium: "Unlimited", enterprise: "Unlimited" },
  { label: "Supplier comparisons", free: "Basic", basic: "More", premium: "Advanced", enterprise: "Advanced" },
  { label: "Supplier messaging & RFQs", free: "—", basic: "Included", premium: "Included", enterprise: "Workflows" },
  { label: "AI sourcing assistant", free: "Limited questions", basic: "Included", premium: "Unlimited conversations", enterprise: "Custom knowledge" },
  { label: "Supplier matching", free: "—", basic: "Standard", premium: "Advanced + priority", enterprise: "Advanced + priority" },
  { label: "Price data", free: "Limited charts", basic: "More data", premium: "Historical + alerts", enterprise: "Historical + alerts" },
  { label: "Material intelligence", free: "Basic", basic: "Research", premium: "Advanced", enterprise: "Advanced" },
  { label: "Quote comparison & reports", free: "—", basic: "—", premium: "Included", enterprise: "Included + API" },
  { label: "Users", free: "1", basic: "1", premium: "1", enterprise: "Multiple + team management" },
  { label: "Support", free: "Community", basic: "Email", premium: "Priority", enterprise: "Dedicated" },
];

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);
  const configured = isBillingProviderConfigured();

  return (
    <div className="bg-white">
      {/* Dark hero */}
      <section className="relative overflow-hidden bg-[#050B12] pb-28 pt-20 text-white sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-30%] h-[50vh] w-[70vw] -translate-x-1/2 rounded-full bg-cyan/20 blur-[140px]" />
        </div>
        <div className="container-page relative text-center">
          <p className="eyebrow text-cyan-glow">{t("pageEyebrow")}</p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            {t("pageTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/65 sm:text-lg">{t("pageSubtitle")}</p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-glow/40 bg-cyan/15 px-4 py-1.5 text-sm font-semibold text-cyan-glow">
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("trialBadge")}
          </span>
        </div>
      </section>

      {/* Plans */}
      <section className="container-page -mt-16 pb-16">
        {!configured && (
          <p className="mx-auto mb-6 max-w-2xl rounded-xl border border-amber-200/70 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-950">
            {t("billingUnavailable")}
          </p>
        )}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const card = (
              <article
                className={`flex h-full flex-col rounded-2xl border bg-white p-6 shadow-card ${
                  plan.highlighted ? "border-navy/40" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-heading-sm text-ink">{plan.name}</h2>
                  {plan.highlighted && (
                    <span className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                      {t("mostPopular")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-muted">{plan.audience}</p>
                <p className="mt-5">
                  <span className="font-display text-4xl font-bold tabular-nums tracking-tight text-ink">
                    {plan.monthlyPrice === null ? t("custom") : plan.priceLabel}
                  </span>
                  {plan.monthlyPrice !== null && (
                    <span className="text-sm text-ink-dim"> {plan.monthlyPrice === 0 ? t("forever") : t("perMonth")}</span>
                  )}
                </p>
                {plan.trialDays > 0 && (
                  <p className="mt-1 text-xs font-semibold text-cyan">{TRIAL_DAYS}-day free trial</p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{plan.description}</p>
                <ul className="mt-5 flex-1 space-y-2">
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
                    highlighted={Boolean(plan.highlighted)}
                    signedIn={signedIn}
                    labels={{ free: t("ctaFree"), trial: t("ctaTrial"), sales: t("ctaSales") }}
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
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-ink-dim">{t("billingNote")}</p>
      </section>

      {/* Comparison */}
      <section className="container-page pb-16">
        <h2 className="text-heading-lg text-ink">{t("compareTitle")}</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-dim">
              <tr>
                <th className="px-4 py-3 font-semibold">&nbsp;</th>
                {PLANS.map((p) => (
                  <th key={p.id} className={`px-4 py-3 font-semibold ${p.highlighted ? "text-navy" : ""}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-ink">{row.label}</td>
                  <td className="px-4 py-3 text-ink-muted">{row.free}</td>
                  <td className="px-4 py-3 text-ink-muted">{row.basic}</td>
                  <td className="px-4 py-3 font-medium text-ink">{row.premium}</td>
                  <td className="px-4 py-3 text-ink-muted">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page pb-24">
        <h2 className="text-heading-lg text-ink">{t("faqTitle")}</h2>
        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          {(["faq1", "faq2", "faq3", "faq4"] as const).map((k) => (
            <div key={k} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <dt className="text-sm font-semibold text-ink">{t(`${k}q`)}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`${k}a`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
