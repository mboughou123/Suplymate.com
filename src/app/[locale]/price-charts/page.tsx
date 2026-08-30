import { getTranslations } from "next-intl/server";
import { getMaterialsFromDb } from "@/lib/data-service";
import ListingPageHero from "@/components/ListingPageHero";
import PriceChartsClient from "./PriceChartsClient";

export default async function PriceChartsPage() {
  const t = await getTranslations("priceCharts");
  const materials = await getMaterialsFromDb();

  return (
    <div className="min-h-screen bg-transparent">
      <ListingPageHero
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-glow backdrop-blur-sm">
            {t("badge")}
          </span>
        }
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        stats={[{ value: materials.length, label: t("materialsTracked") }]}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PriceChartsClient initialMaterials={materials} />
      </div>
    </div>
  );
}
