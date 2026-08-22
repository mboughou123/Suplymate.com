import { getTranslations } from "next-intl/server";
import { completeLocalizedMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.imageRemoval" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return completeLocalizedMetadata({
    locale,
    pathname: "/image-removal-policy",
    title: meta("titleTemplate", { title: t("title") }),
    description: t("intro"),
    siteName: meta("siteName"),
  });
}

export default async function ImageRemovalPolicyPage() {
  const t = await getTranslations("legal.imageRemoval");
  const legal = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-sm text-ink-dim">{legal("lastUpdated")}</p>
      <p className="mt-6 leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("whoTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("whoText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("howTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("howText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("processTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("processText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("counterTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("counterText")}</p>
      </section>
    </div>
  );
}
