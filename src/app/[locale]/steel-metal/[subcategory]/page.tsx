import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getSteelMetalSubcategory,
  getSteelMetalTaxonomy,
  steelMetalLeafHref,
  steelMetalSubcategoryHref,
  steelMetalSubcategoryParams,
} from "@/data/taxonomy/steel-metal";
import TaxonomyBreadcrumb from "@/components/steel-metal/TaxonomyBreadcrumb";

type Props = {
  params: Promise<{ locale: string; subcategory: string }>;
};

export function generateStaticParams() {
  return steelMetalSubcategoryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, subcategory } = await params;
  const category = getSteelMetalSubcategory(subcategory);
  if (!category) return {};
  const t = await getTranslations({ locale, namespace: "steelMetal" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: category.name }),
    description: t("subcategorySubtitle", { count: category.children.length }),
  };
}

export default async function SteelMetalSubcategoryPage({ params }: Props) {
  const { subcategory } = await params;
  const category = getSteelMetalSubcategory(subcategory);
  if (!category) notFound();

  const t = await getTranslations("steelMetal");
  const taxonomy = getSteelMetalTaxonomy();

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="container-page relative">
          <TaxonomyBreadcrumb subcategory={{ id: category.id, name: category.name }} />
          <p className="eyebrow mt-6 text-cyan-glow">{t("eyebrow")}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {category.name}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {t("subcategorySubtitle", { count: category.children.length })}
          </p>
          {category.alibaba_aliases.length > 0 && (
            <p className="mt-3 text-sm text-white/55">
              {t("alsoCalled")}: {category.alibaba_aliases.join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
            {t("allSubcategories")}
          </p>
          <nav className="mt-3 space-y-1" aria-label={t("allSubcategories")}>
            {taxonomy.categories.map((item) => {
              const current = item.id === category.id;
              return (
                <Link
                  key={item.id}
                  href={steelMetalSubcategoryHref(item.id)}
                  aria-current={current ? "page" : undefined}
                  className={`block cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors duration-200 ${
                    current
                      ? "bg-navy text-white"
                      : "text-ink-muted hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="lg:col-span-9">
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {category.children.map((leaf) => (
              <li key={leaf.id}>
                <Link
                  href={steelMetalLeafHref(category.id, leaf.id)}
                  className="group grid cursor-pointer gap-3 px-5 py-5 transition-colors duration-200 hover:bg-cyan-soft/40 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <h2 className="font-display text-heading-sm text-ink transition-colors duration-200 group-hover:text-cyan">
                      {leaf.name}
                    </h2>
                    {leaf.common_names.length > 0 && (
                      <p className="mt-1 text-sm text-ink-muted">
                        {t("commonNames")}: {leaf.common_names.slice(0, 4).join(" · ")}
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-ink-dim">
                    {leaf.forms.length > 0
                      ? `${t("forms")}: ${leaf.forms.join(", ")}`
                      : leaf.variants.grades.slice(0, 4).join(" · ")}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-cyan">
                    {t("viewSpecs")}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
