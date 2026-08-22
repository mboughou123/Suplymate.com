import type { ReactNode } from "react";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: "/forgot-password",
    titleKey: "forgotPasswordTitle",
    descriptionKey: "forgotPasswordDescription",
    robots: { index: false, follow: false },
  });
}

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
