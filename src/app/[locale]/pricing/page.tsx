import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";

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

const PLANS = [
  { key: "starter" as const, highlighted: false },
  { key: "growth" as const, highlighted: true },
  { key: "enterprise" as const, highlighted: false },
];

export default async function PricingPage() {
  const t = await getTranslations("pricing");

  return (
    <div className="min-h-screen bg-gradient-to-b from-base/60 to-white">
      <div className="bg-navy-gradient section-y-tight text-center text-white">
        <div className="container-page relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(36rem_18rem_at_50%_0%,rgba(56,189,248,0.16),transparent_70%)]"
          />
          <h1 className="relative font-display text-display text-white sm:text-display-lg">
            {t("pageTitle")}
          </h1>
          <p className="relative mx-auto mt-4 max-w-xl text-body-lg text-white/75">
            {t("pageSubtitle")}
          </p>
          <p className="relative mt-3 text-sm font-medium text-cyan-glow">{t("annualNote")}</p>
        </div>
      </div>

      <div className="container-page section-y-tight">
        <p className="mx-auto mb-block max-w-2xl rounded-xl border border-amber-200/70 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-950">
          {t("stubNotice")}
        </p>

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {PLANS.map(({ key: plan, highlighted }) => (
            <article
              key={plan}
              className={`panel-glass flex flex-col p-6 sm:p-8 ${
                highlighted ? "shadow-glow-panel ring-1 ring-cyan/20 lg:-translate-y-1" : ""
              }`}
            >
              {highlighted && (
                <span className="mb-4 inline-flex w-fit rounded-full bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
                  {t("mostPopular")}
                </span>
              )}
              <h2 className="text-heading-sm text-ink">{t(plan)}</h2>
              <p className="mt-2 text-sm text-ink-muted">{t(`${plan}Blurb`)}</p>
              <p className="mt-6">
                <span className="font-display text-display font-bold tabular-nums text-ink">
                  {t(`${plan}Price`)}
                </span>
                <span className="text-ink-dim">{t(`${plan}Period`)}</span>
              </p>
              <div className="mt-6 flex-1 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
                  {t("featuresLabel")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("featuresTbd")}</p>
              </div>
              <button
                type="button"
                disabled
                className={`mt-8 w-full cursor-not-allowed rounded-xl py-3 text-sm font-semibold opacity-70 ${
                  highlighted
                    ? "bg-cyan text-white"
                    : "border border-slate-200 bg-white text-ink"
                }`}
              >
                {t("ctaComingSoon")}
              </button>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-block flex max-w-lg items-start justify-center gap-2 text-center text-sm text-ink-muted">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden />
          {t("comingSoon")}
        </p>
      </div>
    </div>
  );
}
