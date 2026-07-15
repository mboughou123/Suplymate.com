import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import AiProcurementDashboard from "@/components/ai-dashboard/AiProcurementDashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("aiAssistantTitle"),
    description: t("aiAssistantDescription"),
  };
}

export default function AiAssistantPage() {
  return (
    <Suspense fallback={null}>
      <AiProcurementDashboard />
    </Suspense>
  );
}
