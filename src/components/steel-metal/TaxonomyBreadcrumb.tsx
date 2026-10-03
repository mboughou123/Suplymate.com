import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { steelMetalHubHref, steelMetalSubcategoryHref } from "@/data/taxonomy/steel-metal";

type Crumb = { href?: string; label: string };

type Props = {
  subcategory?: { id: string; name: string };
  leafName?: string;
};

export default async function TaxonomyBreadcrumb({ subcategory, leafName }: Props) {
  const t = await getTranslations("steelMetal");
  const crumbs: Crumb[] = [
    { href: "/", label: t("breadcrumbHome") },
    {
      href: leafName || subcategory ? steelMetalHubHref() : undefined,
      label: t("breadcrumbHub"),
    },
  ];
  if (subcategory) {
    crumbs.push({
      href: leafName ? steelMetalSubcategoryHref(subcategory.id) : undefined,
      label: subcategory.name,
    });
  }
  if (leafName) crumbs.push({ label: leafName });

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-white/65">
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3 text-white/35" aria-hidden />}
            {crumb.href && !last ? (
              <Link href={crumb.href} className="cursor-pointer transition-colors duration-200 hover:text-cyan-glow">
                {crumb.label}
              </Link>
            ) : (
              <span className={last ? "text-white" : undefined}>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
