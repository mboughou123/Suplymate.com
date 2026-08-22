import { notFound } from "next/navigation";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale, rest } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: `/${rest.join("/")}`,
    titleKey: "notFoundTitle",
    descriptionKey: "notFoundDescription",
    robots: { index: false, follow: false },
  });
}

/** Catch unknown locale-prefixed routes so `[locale]/not-found.tsx` renders. */
export default function CatchAllPage() {
  notFound();
}
