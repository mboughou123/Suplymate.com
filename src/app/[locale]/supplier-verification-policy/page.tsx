import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.supplierVerification" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("title") }),
    description: t("intro"),
  };
}

export default async function SupplierVerificationPolicyPage() {
  const t = await getTranslations("legal.supplierVerification");
  const legal = await getTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-sm text-ink-dim">{legal("lastUpdated")}</p>
      <p className="mt-6 leading-relaxed text-ink-muted">{t("intro")}</p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("statusesTitle")}</h2>
        <ul className="mt-4 space-y-4 text-ink-muted">
          <li>
            <strong className="text-ink">{t("unverified")}</strong>
            <p className="mt-1">{t("unverifiedText")}</p>
          </li>
          <li>
            <strong className="text-ink">{t("claimed")}</strong>
            <p className="mt-1">{t("claimedText")}</p>
          </li>
          <li>
            <strong className="text-ink">{t("verified")}</strong>
            <p className="mt-1">{t("verifiedText")}</p>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("processTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("processText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("claimsTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("claimsText")}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("disclaimerTitle")}</h2>
        <p className="mt-4 leading-relaxed text-ink-muted">{t("disclaimerText")}</p>
      </section>
    </div>
  );
}
