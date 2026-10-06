import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { auth } from "@/auth";
import {
  ANNUAL_DISCOUNT_PERCENT,
  PLANS,
  PLAN_LIMITS,
  SITE_PLAN_PRICES_CENTS,
  TRIAL_DAYS,
  formatUsdCents,
  isBillingProviderConfigured,
} from "@/lib/billing";
import PricingPlansGrid from "@/components/pricing/PricingPlansGrid";

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

const FREE = PLAN_LIMITS.free;
const BASIC = PLAN_LIMITS.basic;

const COMPARE_ROWS: { label: string; free: string; basic: string; premium: string; enterprise: string }[] = [
  { label: "Supplier & product browsing", free: `${FREE.suppliersPerCategory} per category`, basic: "Unlimited", premium: "Unlimited", enterprise: "Unlimited" },
  { label: "Supplier phone, email & website", free: "Locked", basic: "Unlocked", premium: "Unlocked", enterprise: "Unlocked" },
  { label: "AI questions (Mate)", free: `${FREE.aiQuestionsPerMonth} / month`, basic: `${BASIC.aiQuestionsPerMonth} / month`, premium: "Unlimited", enterprise: "Unlimited + custom knowledge" },
  { label: "Saved suppliers", free: `Up to ${FREE.savedSuppliers}`, basic: "Unlimited", premium: "Unlimited", enterprise: "Unlimited" },
  { label: "Price chart history", free: `${FREE.priceHistoryMonths} months`, basic: `${BASIC.priceHistoryMonths} months`, premium: "Full history", enterprise: "Full history" },
  { label: "Price alerts", free: "—", basic: "Included", premium: "Included", enterprise: "Included" },
  { label: "Supplier messaging & RFQs", free: "Included", basic: "Included", premium: "Included", enterprise: "Workflows" },
  { label: "Quote comparison & reports", free: "—", basic: "—", premium: "Included", enterprise: "Included + API" },
  { label: "Users", free: "1", basic: "1", premium: "Team workspaces", enterprise: "Multiple + team management" },
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

      {/* Plans — z-10 keeps the cards above the hero they overlap. */}
      <section className="container-page relative z-10 -mt-16 pb-16">
        {!configured && (
          <p className="mx-auto mb-6 max-w-2xl rounded-xl border border-amber-200/70 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-950">
            {t("billingUnavailable")}
          </p>
        )}
        <PricingPlansGrid signedIn={signedIn} />
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-ink-dim">
          {t("billingNoteV2", {
            days: TRIAL_DAYS,
            percent: ANNUAL_DISCOUNT_PERCENT,
            enterprise: formatUsdCents(SITE_PLAN_PRICES_CENTS.enterprise),
          })}
        </p>
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
