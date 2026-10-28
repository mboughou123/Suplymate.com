import { getTranslations, setRequestLocale } from "next-intl/server";
import HomeTopNav from "@/components/home/HomeTopNav";
import HomeHero from "@/components/home/HomeHero";
import HomeTrustStrip from "@/components/home/HomeTrustStrip";
import HomeSuppliersBand from "@/components/home/HomeSuppliersBand";
import HomeProductsSection from "@/components/home/HomeProductsSection";
import HomeInsuranceSection from "@/components/home/HomeInsuranceSection";
import HomeOrchestratorSection from "@/components/home/HomeOrchestratorSection";
import HomeBenefitsBand from "@/components/home/HomeBenefitsBand";
import HomeFaqSection from "@/components/home/HomeFaqSection";
import HomeEarlyAccess from "@/components/home/HomeEarlyAccess";
import HomeCloseSection from "@/components/HomeCloseSection";
import { getHomePageContent } from "@/lib/home-page-data";
import { getSuppliersFromDb } from "@/lib/data-service";
import { publicSupplierStats } from "@/lib/sourced-facts";

// ISR: supplier counts come from the same listed directory as /suppliers.
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const [home, suppliers] = await Promise.all([
    Promise.resolve(getHomePageContent()),
    getSuppliersFromDb(),
  ]);
  const network = publicSupplierStats(suppliers);

  return (
    <div className="bg-base">
      <HomeTopNav />
      <HomeHero
        supplierCount={network.supplierCount}
        industryCount={home.industryCount}
        materialCount={home.materialCount}
      />
      <HomeTrustStrip />
      <HomeSuppliersBand />
      {/* Who is on the network (suppliers) → what they make (products) → how
          Mate helps you buy it (orchestrator). */}
      <HomeProductsSection items={home.products} />
      <HomeInsuranceSection />
      <HomeOrchestratorSection />
      <HomeBenefitsBand
        countryCount={network.countryCount}
        materialCount={home.materialCount}
      />
      <HomeFaqSection />
      <HomeEarlyAccess locale={locale} />
      <HomeCloseSection
        title={t("ctaTitle")}
        subtitle={t("ctaSubtitle")}
        tryLabel={t("tryWalkthrough")}
        plansLabel={t("seePlans")}
      />
    </div>
  );
}
