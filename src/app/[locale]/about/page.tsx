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
    title: t("aboutTitle"),
    description: t("aboutDescription"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const footer = await getTranslations("footer");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("missionTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("missionText")}</p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("platformTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("platformIntro")}</p>
        <ul className="mt-6 space-y-4 text-ink-muted">
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("supplierDirectory")}</strong>{" "}
              {t("supplierDirectoryText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("rfqs")}</strong> {t("rfqsText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("marketIntelligence")}</strong>{" "}
              {t("marketIntelligenceText")}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1 text-cyan">•</span>
            <span>
              <strong className="text-ink">{t("aiAssistant")}</strong>{" "}
              {t("aiAssistantText")}
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-8">
        <h2 className="font-display text-2xl font-semibold text-ink">{footer("contact")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          <Link href="/contact" className="text-cyan transition-colors hover:text-teal">
            {footer("contact")}
          </Link>{" "}
          · info@suplymate.com
        </p>
      </section>
    </div>
  );
}
