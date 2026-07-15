import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.cookies" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("title") }),
    description: t("intro"),
  };
}

export default async function CookiesPage() {
  const t = await getTranslations("legal.cookies");
  const legal = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-sm text-ink-dim">{legal("lastUpdated")}</p>
      <p className="mt-6 leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("whatTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("whatText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("howTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("howText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("typesTitle")}</h2>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("essential")}</strong> {t("essentialText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("preference")}</strong> {t("preferenceText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("analytics")}</strong> {t("analyticsText")}
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("manageTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("manageText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("contactTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("contactText")}</p>
      </section>
    </div>
  );
}
