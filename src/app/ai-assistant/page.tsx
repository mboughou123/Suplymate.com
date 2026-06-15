import { Suspense } from "react";
import AiProcurementDashboard from "@/components/ai-dashboard/AiProcurementDashboard";

export const metadata = {
  title: "AI Procurement Assistant · Suplymate",
  description:
    "Source smarter with AI-powered supplier intelligence, pricing analysis, and procurement recommendations.",
};

export default function AiAssistantPage() {
  return (
    <Suspense fallback={null}>
      <AiProcurementDashboard />
    </Suspense>
  );
}
