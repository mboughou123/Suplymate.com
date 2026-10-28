import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const EarlyAccessForm = dynamic(() => import("@/components/early-access/EarlyAccessForm"));

/** Compact signup under the fold so it does not compete with the homepage hero. */
export default async function HomeEarlyAccess({ locale }: { locale: string }) {
  const t = await getTranslations("earlyAccess");

  return (
    <section className="bg-base pb-4" aria-labelledby="early-access-heading">
      <div className="container-page">
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-card sm:px-8 sm:py-10">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="eyebrow text-cyan">{t("eyebrow")}</p>
              <h2 id="early-access-heading" className="mt-3 font-display text-display text-ink text-balance">
                {t("compactTitle")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">{t("compactBody")}</p>
              <Link href="/early-access" className="mt-4 inline-flex text-sm font-semibold text-cyan hover:underline">
                {t("fullPage")}
              </Link>
            </div>
            <EarlyAccessForm locale={locale} variant="compact" />
          </div>
        </div>
      </div>
    </section>
  );
}
