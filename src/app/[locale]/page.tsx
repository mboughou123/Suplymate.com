import { getTranslations, setRequestLocale } from "next-intl/server";
import HomeTopNav from "@/components/home/HomeTopNav";
import HomeHero from "@/components/home/HomeHero";
import HomeTrustStrip from "@/components/home/HomeTrustStrip";
import HomeSuppliersBand from "@/components/home/HomeSuppliersBand";
import HomeOrchestratorSection from "@/components/home/HomeOrchestratorSection";
import HomeBenefitsBand from "@/components/home/HomeBenefitsBand";
import HomeFaqSection from "@/components/home/HomeFaqSection";
import HomeCloseSection from "@/components/HomeCloseSection";
import { getSuppliersFromDb } from "@/lib/data-service";
import { INDUSTRIES } from "@/data/industries";
import { MATERIAL_CATALOG } from "@/data/material-catalog";
import { countSupplierCountries } from "@/lib/home-benefits";

// Static + ISR: the only per-request data is the supplier count, which only
// needs to be fresh to the minute. Everything else is translated copy.
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, suppliers] = await Promise.all([
    getTranslations("home"),
    getSuppliersFromDb().catch(() => []),
  ]);

  return (
    <div className="bg-base">
      <HomeTopNav />
      <HomeHero
        supplierCount={suppliers.length}
        industryCount={INDUSTRIES.length}
        materialCount={MATERIAL_CATALOG.length}
      />
      <HomeTrustStrip />
      <HomeSuppliersBand />
      <HomeOrchestratorSection />
      <HomeBenefitsBand
        countryCount={countSupplierCountries(suppliers)}
        materialCount={MATERIAL_CATALOG.length}
      />
      <HomeFaqSection />
      <HomeCloseSection
        title={t("ctaTitle")}
        subtitle={t("ctaSubtitle")}
        tryLabel={t("tryWalkthrough")}
        plansLabel={t("seePlans")}
      />
    </div>
  );
}
