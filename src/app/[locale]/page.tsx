import { getTranslations } from "next-intl/server";
import HomeTopNav from "@/components/home/HomeTopNav";
import HomeHero from "@/components/home/HomeHero";
import HomeTrustStrip from "@/components/home/HomeTrustStrip";
import HomeSuppliersBand from "@/components/home/HomeSuppliersBand";
import HomeOrchestratorSection from "@/components/home/HomeOrchestratorSection";
import HomeStatsRow from "@/components/home/HomeStatsRow";
import HomeCloseSection from "@/components/HomeCloseSection";
import { getSuppliersFromDb } from "@/lib/data-service";

export default async function HomePage() {
  const t = await getTranslations("home");
  const suppliers = await getSuppliersFromDb().catch(() => []);

  return (
    <div className="bg-base">
      <HomeTopNav />
      <HomeHero supplierCount={suppliers.length} />
      <HomeTrustStrip />
      <HomeSuppliersBand />
      <HomeOrchestratorSection />
      <HomeStatsRow />
      <HomeCloseSection
        title={t("ctaTitle")}
        subtitle={t("ctaSubtitle")}
        tryLabel={t("tryWalkthrough")}
        plansLabel={t("seePlans")}
      />
    </div>
  );
}
