import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("privacyTitle"),
    description: t("privacyDescription"),
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal.privacy");
  const legal = await getTranslations("legal");
  const footer = await getTranslations("footer");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-sm text-ink-dim">{legal("lastUpdated")}</p>
      <p className="mt-6 leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("collectTitle")}</h2>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("accountInfo")}</strong> {t("accountInfoText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("rfqContent")}</strong> {t("rfqContentText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("usageInfo")}</strong> {t("usageInfoText")}
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("useTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("useText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("thirdPartiesTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("thirdPartiesIntro")}</p>
        <ul className="mt-4 space-y-3 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("hosting")}</strong> {t("hostingText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("aiProcessing")}</strong> {t("aiProcessingText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("analytics")}</strong> {t("analyticsText")}
            </span>
          </li>
        </ul>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("noSell")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("cookiesTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          {t("cookiesText")}{" "}
          <Link href="/cookies" className="text-cyan transition-colors hover:text-teal">
            {footer("cookies")}
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("rightsTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("rightsText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("retentionTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("retentionText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("changesTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("changesText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("contactTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("contactText")}</p>
      </section>
    </div>
  );
}
