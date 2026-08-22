import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import MessagesClient from "./MessagesClient";
import { completeLocalizedMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "navigation" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return completeLocalizedMetadata({
    locale,
    pathname: "/messages",
    title: meta("titleTemplate", { title: t("messages") }),
    description: meta("description"),
    siteName: meta("siteName"),
    robots: { index: false, follow: false },
  });
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesClient />
    </Suspense>
  );
}
