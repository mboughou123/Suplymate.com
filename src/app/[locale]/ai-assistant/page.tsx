import { Suspense } from "react";
import AiProcurementDashboard from "@/components/ai-dashboard/AiProcurementDashboard";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({ locale, pathname: "/ai-assistant", titleKey: "aiAssistantTitle", descriptionKey: "aiAssistantDescription" });
}

export default function AiAssistantPage() {
  return (
    <Suspense fallback={null}>
      <AiProcurementDashboard />
    </Suspense>
  );
}
