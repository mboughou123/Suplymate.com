import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.refundPolicy" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("title") }),
    description: t("intro"),
  };
}

export default async function RefundAndProtectionPolicyPage() {
  const t = await getTranslations("legal.refundPolicy");
  const legal = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-sm text-ink-dim">{legal("lastUpdated")}</p>
      <p className="mt-6 leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("noPaymentsTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("noPaymentsText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("noEscrowTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("noEscrowText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("subscriptionsTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("subscriptionsText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("dueDiligenceTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("dueDiligenceText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("contactTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("contactText")}</p>
      </section>
    </div>
  );
}
