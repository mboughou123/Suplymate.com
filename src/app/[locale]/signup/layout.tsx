import type { ReactNode } from "react";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: "/signup",
    titleKey: "signupTitle",
    descriptionKey: "signupDescription",
    robots: { index: false, follow: false },
  });
}

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
