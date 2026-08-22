import { getTranslations } from "next-intl/server";
import { Search, BadgeCheck, Inbox } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";
import { getSiteStats } from "@/lib/site-stats";
import WaitlistForm from "@/components/forms/WaitlistForm";
import SalesInquiryForm from "@/components/forms/SalesInquiryForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: "/for-suppliers",
    titleKey: "forSuppliersTitle",
    descriptionKey: "forSuppliersDescription",
  });
}

const STEP_ICONS = [Search, BadgeCheck, Inbox] as const;

export default async function ForSuppliersPage() {
  const t = await getTranslations("forSuppliers");
  // Real counts from the database, so this page never states a figure the
  // directory cannot back up.
  const stats = await getSiteStats();

  const steps = [1, 2, 3].map((n, i) => ({
    icon: STEP_ICONS[i],
    title: t(`step${n}Title`),
    text: t(`step${n}Text`),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <span className="eyebrow text-teal">{t("eyebrow")}</span>
        <h1 className="mt-3 font-display text-4xl font-bold text-balance text-ink">
          {t("title")}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-muted">
          {t("intro")}
        </p>
        <p className="mt-4 text-body tabular-nums text-ink-muted">
          {t("coverageSummary", {
            suppliers: stats.supplierCount,
            countries: stats.countryCount,
            categories: stats.categoryCount,
          })}
        </p>
        <Link href="/suppliers" className="btn-primary mt-8 px-6 py-3">
          <Search className="h-4 w-4" aria-hidden />
          {t("findListingCta")}
        </Link>
      </header>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("howItWorksTitle")}
        </h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10 text-teal">
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <p className="mt-4 text-caption font-semibold uppercase tracking-wide text-ink-dim">
                  {i + 1}
                </p>
                <h3 className="mt-1 text-body font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-body text-ink-muted">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Stating the limits of a listing up front is the point of this block:
          suppliers arrive assuming inclusion implies endorsement. */}
      <section className="mt-16 rounded-2xl border border-line bg-base p-8">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("honestyTitle")}
        </h2>
        <ul className="mt-5 space-y-4 text-ink-muted">
          {(["honestyListed", "honestyVerified", "honestyNoPayment"] as const).map(
            (key) => (
              <li key={key} className="flex gap-3">
                <span aria-hidden className="mt-1 text-teal">
                  •
                </span>
                <span className="leading-relaxed">{t(key)}</span>
              </li>
            )
          )}
        </ul>
      </section>

      <section className="mt-16 max-w-xl">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("claimTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-ink-muted">{t("claimText")}</p>
        <div className="mt-6">
          <WaitlistForm
            source="for-suppliers"
            label={t("waitlistLabel")}
            placeholder={t("waitlistPlaceholder")}
            submitLabel={t("waitlistSubmit")}
            successMessage={t("waitlistSuccess")}
          />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("contactTitle")}
        </h2>
        <div className="mt-6">
          <SalesInquiryForm
            source="for-suppliers"
            defaultTopic="SUPPLIER_ONBOARDING"
          />
        </div>
      </section>
    </div>
  );
}
