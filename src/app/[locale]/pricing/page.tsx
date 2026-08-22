import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";
import { isStripeConfigured, stripePriceIdFor } from "@/lib/billing";
import PricingCheckoutButton from "@/components/PricingCheckoutButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: "/pricing",
    titleKey: "pricingTitle",
    descriptionKey: "pricingDescription",
  });
}

const PLANS = [
  { key: "starter" as const, features: 4, highlighted: false },
  { key: "pro" as const, features: 5, highlighted: true },
  { key: "enterprise" as const, features: 5, highlighted: false },
];

export default async function PricingPage() {
  const t = await getTranslations("pricing");
  const session = await auth();
  const proCheckoutConfigured =
    isStripeConfigured() && Boolean(stripePriceIdFor("pro"));

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-16 text-white text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold">{t("pageTitle")}</h1>
          <p className="mt-4 text-white/75 max-w-xl mx-auto">
            {t(proCheckoutConfigured ? "pageSubtitle" : "pageSubtitleUnavailable")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {PLANS.map(({ key: plan, features, highlighted }) => {
            const periodKey = `${plan}Period` as "starterPeriod" | "proPeriod" | "enterprisePeriod";
            const hasPeriod = plan !== "enterprise";

            return (
              <div
                key={plan}
                className={`flex flex-col rounded-2xl border p-8 ${
                  highlighted
                    ? "border-mustard bg-base shadow-cardHover ring-2 ring-mustard/20 scale-[1.02]"
                    : "border-line bg-base shadow-card"
                }`}
              >
                {highlighted && (
                  <span className="mb-4 inline-flex w-fit rounded-full bg-mustard px-3 py-1 text-xs font-semibold text-ink">
                    {t("mostPopular")}
                  </span>
                )}
                <h2 className="text-xl font-semibold text-ink">{t(plan)}</h2>
                <p className="mt-4">
                  <span className="text-4xl font-bold text-ink">{t(`${plan}Price`)}</span>
                  {hasPeriod && <span className="text-ink-dim">{t(periodKey)}</span>}
                </p>
                <ul className="mt-8 flex-1 space-y-3 text-sm text-ink-muted">
                  {Array.from({ length: features }, (_, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-mustard">✓</span>
                      {t(`${plan}Feature${i + 1}` as "starterFeature1")}
                    </li>
                  ))}
                </ul>
                {(() => {
                  const ctaClass = `mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                    highlighted
                      ? "bg-mustard text-ink hover:bg-mustard-light"
                      : "bg-navy text-white hover:bg-navy-mid"
                  }`;

                  if (plan === "starter") {
                    return (
                      <Link href="/signup" className={ctaClass}>
                        {t("starterCta")}
                      </Link>
                    );
                  }
                  if (plan === "enterprise" || !proCheckoutConfigured) {
                    return (
                      <Link href="/contact" className={ctaClass}>
                        {t(
                          plan === "enterprise"
                            ? "enterpriseCta"
                            : "billingUnavailableCta"
                        )}
                      </Link>
                    );
                  }
                  if (!session?.user) {
                    return (
                      <Link href="/signup" className={ctaClass}>
                        {t("proSignupCta")}
                      </Link>
                    );
                  }
                  return (
                    <PricingCheckoutButton
                      label={t("proCta")}
                      busyLabel={t("checkoutStarting")}
                      errorLabel={t("checkoutError")}
                      className={ctaClass}
                    />
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
