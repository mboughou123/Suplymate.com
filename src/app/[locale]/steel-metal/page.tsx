import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getSteelMetalTaxonomy,
  steelMetalSubcategoryHref,
} from "@/data/taxonomy/steel-metal";
import TaxonomyBreadcrumb from "@/components/steel-metal/TaxonomyBreadcrumb";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "steelMetal" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("hubTitle") }),
    description: t("hubSubtitle"),
  };
}

export default async function SteelMetalHubPage() {
  const t = await getTranslations("steelMetal");
  const taxonomy = getSteelMetalTaxonomy();
  const leafCount = taxonomy.categories.reduce((sum, cat) => sum + cat.children.length, 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-dark to-navy py-16 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-[-40%] h-[50vh] w-[60vw] -translate-x-1/2 rounded-full bg-cyan/20 blur-[140px]" />
        </div>
        <div className="container-page relative">
          <TaxonomyBreadcrumb />
          <p className="eyebrow mt-6 text-cyan-glow">{t("eyebrow")}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {t("hubTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">{t("hubSubtitle")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white">
              {t("statSubcategories", { count: taxonomy.categories.length })}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white">
              {t("statLeaves", { count: leafCount })}
            </span>
            <span className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 font-medium text-cyan-glow">
              {t("hubPolicy")}
            </span>
          </div>
        </div>
      </div>

      <div className="container-page py-12">
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {taxonomy.categories.map((category, index) => {
            const href = steelMetalSubcategoryHref(category.id);
            const preview = category.children.slice(0, 3).map((leaf) => leaf.name);
            return (
              <li key={category.id}>
                <Link
                  href={href}
                  className="group flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-[border-color,box-shadow] duration-200 hover:border-cyan/40 hover:shadow-cardHover"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs font-semibold tracking-wider text-ink-dim">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                      {t("leafCount", { count: category.children.length })}
                    </span>
                  </div>
                  <h2 className="mt-4 font-display text-heading text-ink transition-colors duration-200 group-hover:text-cyan">
                    {category.name}
                  </h2>
                  {category.alibaba_aliases.length > 0 && (
                    <p className="mt-2 text-sm text-ink-muted">
                      {t("alsoCalled")}: {category.alibaba_aliases.slice(0, 3).join(" · ")}
                    </p>
                  )}
                  <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
                    {preview.map((name) => (
                      <li key={name} className="flex items-start gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" aria-hidden />
                        {name}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-cyan transition-all duration-200 group-hover:gap-2">
                    {t("browseTypes", { count: category.children.length })}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
