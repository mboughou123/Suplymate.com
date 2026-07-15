import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("title") }),
    description: t("intro"),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  const legal = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-sm text-ink-dim">{legal("lastUpdated")}</p>
      <p className="mt-6 leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("acceptanceTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("acceptanceText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("platformTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("platformText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("accountsTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("accountsText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("contentTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("contentText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("prohibitedTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("prohibitedText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("disclaimerTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("disclaimerText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("liabilityTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("liabilityText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("changesTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("changesText")}</p>
      </section>
    </div>
  );
}
