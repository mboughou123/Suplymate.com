import { getTranslations } from "next-intl/server";
import { getSuppliersFromDb } from "@/lib/data-service";
import SuppliersClient from "./SuppliersClient";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: "/suppliers",
    titleKey: "suppliersTitle",
    descriptionKey: "suppliersDescription",
  });
}

export default async function SuppliersPage() {
  const t = await getTranslations("suppliers");
  const suppliers = await getSuppliersFromDb();

  // This used to count `s.verified`, which the importer set for any supplier
  // with a strong Google rating. Nothing here has been verified by a person, so
  // that count is now always zero. A buyer is better served knowing how many
  // listings they can actually act on.
  const contactableCount = suppliers.filter(
    (s) => s.phone || s.email || s.website
  ).length;
  // Count only the recorded `country` field. Falling back to the last comma-
  // separated fragment of `location` split city strings into pseudo-countries,
  // so this page advertised 19 countries while the homepage, which reads the
  // same database through getSiteStats, said 11.
  const countryCount = new Set(
    suppliers.map((s) => s.country?.trim()).filter(Boolean)
  ).size;

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-glow">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t("badge")}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            {t("pageTitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-white/75">
            {t("pageSubtitle", { count: suppliers.length, countries: countryCount })}
          </p>
          <div className="mt-5 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-2xl font-bold text-white">{suppliers.length}</p>
              <p className="text-white/60">{t("suppliersCount")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{contactableCount}</p>
              <p className="text-white/60">{t("verifiedCount")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{countryCount}</p>
              <p className="text-white/60">{t("countriesCount")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SuppliersClient initialSuppliers={suppliers} />
      </div>
    </div>
  );
}
