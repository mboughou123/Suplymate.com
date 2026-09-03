import { getTranslations } from "next-intl/server";
import HomeHero from "@/components/home/HomeHero";
import HomeTrustStrip from "@/components/home/HomeTrustStrip";
import HomeSuppliersBand from "@/components/home/HomeSuppliersBand";
import HomeAiDemoSection from "@/components/HomeAiDemoSection";
import HomeProductModules from "@/components/home/HomeProductModules";
import HomeStatsRow from "@/components/home/HomeStatsRow";
import HomeCloseSection from "@/components/HomeCloseSection";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <div className="bg-base">
      <HomeHero />
      <HomeTrustStrip />
      <HomeSuppliersBand />
      <HomeAiDemoSection />
      <HomeProductModules />
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
