import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getMaterialsWithPricing, pricingStatus } from "@/lib/pricing/pricingService";
import MaterialsClient from "./MaterialsClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "priceCharts" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("pageEyebrow") }),
    description: t("pageSubtitle"),
  };
}

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const t = await getTranslations("priceCharts");
  const materials = await getMaterialsWithPricing();
  const pricing = pricingStatus();

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden bg-[#050B12] py-16 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-[-40%] h-[50vh] w-[60vw] -translate-x-1/2 rounded-full bg-cyan/20 blur-[140px]" />
        </div>
        <div className="container-page relative">
          <p className="eyebrow text-cyan-glow">{t("pageEyebrow")}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {t("pageTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-white/65">{t("pageSubtitle")}</p>
        </div>
      </div>

      <div className="container-page py-10">
        <Suspense fallback={null}>
          <MaterialsClient initialMaterials={materials} pricing={pricing} />
        </Suspense>
      </div>
    </div>
  );
}
