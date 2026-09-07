import { getTranslations, setRequestLocale } from "next-intl/server";
import HomeTopNav from "@/components/home/HomeTopNav";
import HomeHero from "@/components/home/HomeHero";
import HomeTrustStrip from "@/components/home/HomeTrustStrip";
import HomeSuppliersBand from "@/components/home/HomeSuppliersBand";
import HomeProductsSection from "@/components/home/HomeProductsSection";
import HomeOrchestratorSection from "@/components/home/HomeOrchestratorSection";
import HomeBenefitsBand from "@/components/home/HomeBenefitsBand";
import HomeFaqSection from "@/components/home/HomeFaqSection";
import HomeCloseSection from "@/components/HomeCloseSection";
import { getProductsFromDb, getSuppliersFromDb } from "@/lib/data-service";
import { INDUSTRIES } from "@/data/industries";
import { MATERIAL_CATALOG } from "@/data/material-catalog";
import { countSupplierCountries } from "@/lib/home-benefits";

// Static + ISR: the per-request data is the supplier count and the product
// grid picks, which only need to be fresh to the minute (both come from the
// memoised catalogue reads). Everything else is translated copy.
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, suppliers, products] = await Promise.all([
    getTranslations("home"),
    getSuppliersFromDb().catch(() => []),
    getProductsFromDb().catch(() => []),
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
      {/* Who is on the network (suppliers) → what they make (products) → how
          Mate helps you buy it (orchestrator). */}
      <HomeProductsSection products={products} />
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
