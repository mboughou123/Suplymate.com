import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildPageAlternates } from "@/lib/locale-metadata";
import type { Locale } from "@/i18n/routing";

type PageMetadataOptions = {
  locale: string;
  pathname: string;
  titleKey: string;
  descriptionKey: string;
  robots?: Metadata["robots"];
};

type CompleteMetadataOptions = {
  locale: string;
  pathname: string;
  title: string;
  description: string;
  siteName: string;
  robots?: Metadata["robots"];
};

export function completeLocalizedMetadata({
  locale,
  pathname,
  title,
  description,
  siteName,
  robots,
}: CompleteMetadataOptions): Metadata {
  const alternates = buildPageAlternates(locale as Locale, pathname);
  return {
    title,
    description,
    alternates,
    robots,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export async function buildLocalizedPageMetadata({
  locale,
  pathname,
  titleKey,
  descriptionKey,
  robots,
}: PageMetadataOptions): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t(titleKey);
  const description = t(descriptionKey);
  return completeLocalizedMetadata({
    locale,
    pathname,
    title,
    description,
    siteName: t("siteName"),
    robots,
  });
}
