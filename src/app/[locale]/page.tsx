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
import { getHomePageContent } from "@/lib/home-page-data";

// Static + ISR: homepage stats and product picks come from the curated pack
// (no per-request Prisma or Outscraper dump).
export const revalidate = 300;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const home = getHomePageContent();

  return (
    <div className="bg-base">
      <HomeTopNav />
      <HomeHero
        supplierCount={home.supplierCount}
        industryCount={home.industryCount}
        materialCount={home.materialCount}
      />
      <HomeTrustStrip />
      <HomeSuppliersBand />
      {/* Who is on the network (suppliers) → what they make (products) → how
          Mate helps you buy it (orchestrator). */}
      <HomeProductsSection items={home.products} />
      <HomeOrchestratorSection />
      <HomeBenefitsBand
        countryCount={home.countryCount}
        materialCount={home.materialCount}
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
