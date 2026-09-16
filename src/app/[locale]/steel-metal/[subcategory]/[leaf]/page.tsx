import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getSteelMetalLeaf,
  steelMetalLeafParams,
} from "@/data/taxonomy/steel-metal";
import { findPackListingsForLeaf } from "@/lib/steel-metal-listings";
import TaxonomyBreadcrumb from "@/components/steel-metal/TaxonomyBreadcrumb";
import LeafVariantExplorer from "@/components/steel-metal/LeafVariantExplorer";
import PackListingCards from "@/components/steel-metal/PackListingCards";

type Props = {
  params: Promise<{ locale: string; subcategory: string; leaf: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return steelMetalLeafParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, subcategory, leaf } = await params;
  const row = getSteelMetalLeaf(subcategory, leaf);
  if (!row) return {};
  const t = await getTranslations({ locale, namespace: "steelMetal" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: row.leaf.name }),
    description: t("leafMeta", { subcategory: row.subcategory.name }),
  };
}

function flattenQuery(query: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string" && first.trim()) out[key] = first.trim();
  }
  return out;
}

export default async function SteelMetalLeafPage({ params, searchParams }: Props) {
  const { subcategory, leaf } = await params;
  const row = getSteelMetalLeaf(subcategory, leaf);
  if (!row) notFound();

  const t = await getTranslations("steelMetal");
  const query = flattenQuery(await searchParams);
  const listings = findPackListingsForLeaf(row.leaf);
  const searchHref = `/products?search=${encodeURIComponent(row.leaf.name)}`;
  const mateHref = `/ai-assistant?q=${encodeURIComponent(row.leaf.name)}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="container-page relative">
          <TaxonomyBreadcrumb
            subcategory={{ id: row.subcategory.id, name: row.subcategory.name }}
            leafName={row.leaf.name}
          />
          <p className="eyebrow mt-6 text-cyan-glow">{row.subcategory.name}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {row.leaf.name}
          </h1>
          {row.leaf.common_names.length > 0 && (
            <p className="mt-4 max-w-2xl text-white/70">
              {t("commonNames")}: {row.leaf.common_names.join(" · ")}
            </p>
          )}
          <p className="mt-5 text-sm font-medium text-cyan-glow">{t("hubPolicy")}</p>
        </div>
      </div>

      <div className="container-page space-y-12 py-10">
        <Suspense fallback={null}>
          <LeafVariantExplorer leaf={row.leaf} initialQuery={query} />
        </Suspense>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-heading text-ink">{t("relatedListings")}</h2>
              <p className="mt-1 text-sm text-ink-muted">{t("relatedListingsHint")}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link href={searchHref} className="cursor-pointer text-cyan transition-colors duration-200 hover:text-navy">
                {t("browseCatalogue")}
              </Link>
              <Link href={mateHref} className="cursor-pointer text-cyan transition-colors duration-200 hover:text-navy">
                {t("askMate")}
              </Link>
              <Link href="/materials" className="cursor-pointer text-cyan transition-colors duration-200 hover:text-navy">
                {t("priceCharts")}
              </Link>
            </div>
          </div>
          <div className="mt-5">
            <PackListingCards listings={listings} leafName={row.leaf.name} />
          </div>
        </section>
      </div>
    </div>
  );
}
