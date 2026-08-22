import { getTranslations } from "next-intl/server";
import { completeLocalizedMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.reviewPolicy" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return completeLocalizedMetadata({
    locale,
    pathname: "/review-policy",
    title: meta("titleTemplate", { title: t("title") }),
    description: t("intro"),
    siteName: meta("siteName"),
  });
}

export default async function ReviewPolicyPage() {
  const t = await getTranslations("legal.reviewPolicy");
  const legal = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-sm text-ink-dim">{legal("lastUpdated")}</p>
      <p className="mt-6 leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("eligibilityTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("eligibilityText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("moderationTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("moderationText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("reportingTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("reportingText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("removalTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("removalText")}</p>
      </section>
    </div>
  );
}
