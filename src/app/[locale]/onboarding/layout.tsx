import type { ReactNode } from "react";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: "/onboarding",
    titleKey: "onboardingTitle",
    descriptionKey: "onboardingDescription",
    robots: { index: false, follow: false },
  });
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
