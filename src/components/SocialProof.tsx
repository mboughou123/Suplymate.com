import { getTranslations } from "next-intl/server";
import { Database, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Reveal from "@/components/Reveal";
import { getSiteStats } from "@/lib/site-stats";

export default async function SocialProof() {
  const t = await getTranslations("suppliers");
  const stats = await getSiteStats();

  return (
    <section className="border-b border-line py-20 sm:py-24">
      <div className="container-page">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-cyan">{t("coverageEyebrow")}</p>
          <h2 className="mt-4 font-display text-display text-ink">
            {t("coverageTitle")}
          </h2>
          <p className="mt-4 text-body-lg text-ink-muted">
            {t("coverageSummary", {
              suppliers: stats.supplierCount,
              countries: stats.countryCount,
              categories: stats.categoryCount,
            })}
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <ul className="flex flex-wrap justify-center gap-3">
            {stats.countryCoverage.map(({ country, supplierCount }) => (
              <li
                key={country ?? "unknown"}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-body-sm text-ink shadow-sm"
              >
                <MapPin className="h-4 w-4 text-cyan" aria-hidden />
                <span>{country ?? t("countryNotProvided")}</span>
                <span className="font-semibold tabular-nums text-ink">
                  {supplierCount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-10 rounded-2xl border border-line bg-base p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
              <div>
                <h3 className="font-semibold text-ink">{t("coverageSourcesTitle")}</h3>
                <p className="mt-1 text-body-sm text-ink-muted">
                  {t("coverageSourcesText")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
              <div>
                <h3 className="font-semibold text-ink">{t("coverageStatusTitle")}</h3>
                <p className="mt-1 text-body-sm text-ink-muted">
                  {t("coverageStatusText")}{" "}
                  <Link
                    href="/supplier-verification-policy"
                    className="font-semibold text-cyan underline-offset-4 hover:underline"
                  >
                    {t("coveragePolicyLink")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
