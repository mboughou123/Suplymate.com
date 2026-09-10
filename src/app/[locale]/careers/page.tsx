import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getTranslations({ locale, namespace: "metadata" });
  const t = await getTranslations({ locale, namespace: "careers" });
  return {
    title: meta("titleTemplate", { title: t("eyebrow") }),
    description: t("intro"),
  };
}

export default async function CareersPage() {
  const t = await getTranslations("careers");
  return (
    <div className="bg-base pb-section pt-28 sm:pt-32">
      <div className="container-page max-w-3xl">
        <p className="eyebrow text-cyan">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-display text-ink">{t("title")}</h1>
        <p className="mt-4 text-body-lg text-ink-muted">{t("intro")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/contact" className="btn-accent px-6 py-3 text-sm">
            {t("applyNow")}
          </Link>
          <Link href="/about" className="btn-secondary px-6 py-3 text-sm">
            {t("viewRoles")}
          </Link>
        </div>
      </div>
    </div>
  );
}
