import { unstable_cache } from "next/cache";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";
import { verifiedSuppliers } from "@/data/verified-suppliers";
import { prisma } from "@/lib/prisma";

export type CountryCoverage = {
  country: string;
  supplierCount: number;
};

export type SiteStats = {
  supplierCount: number;
  countryCount: number;
  categoryCount: number;
  countryCoverage: CountryCoverage[];
};

// Rows with no country/category must never be counted as one: an unlabelled
// row would otherwise inflate the published coverage figures by one.
function staticSiteStats(): SiteStats {
  const suppliers =
    outscraperSuppliers.length > 0 ? outscraperSuppliers : verifiedSuppliers;
  const countryCounts = new Map<string, number>();
  const categories = new Set<string>();

  for (const supplier of suppliers) {
    const country = supplier.country?.trim();
    const category = supplier.category?.trim();
    if (country) countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
    if (category) categories.add(category);
  }

  return {
    supplierCount: suppliers.length,
    countryCount: countryCounts.size,
    categoryCount: categories.size,
    countryCoverage: [...countryCounts.entries()]
      .map(([country, supplierCount]) => ({ country, supplierCount }))
      .sort(
        (a, b) =>
          b.supplierCount - a.supplierCount ||
          a.country.localeCompare(b.country)
      ),
  };
}

async function loadSiteStats(): Promise<SiteStats> {
  try {
    const [supplierCount, countryGroups, categoryGroups] =
      await Promise.all([
        prisma.supplier.count(),
        prisma.supplier.groupBy({
          by: ["country"],
          _count: { id: true },
          orderBy: { country: "asc" },
        }),
        prisma.supplier.groupBy({
          by: ["category"],
          _count: { id: true },
          orderBy: { category: "asc" },
        }),
      ]);

    if (supplierCount === 0) return staticSiteStats();

    const namedCountries = countryGroups.flatMap((group) => {
      const country = group.country?.trim();
      return country ? [{ country, supplierCount: group._count.id }] : [];
    });
    const namedCategories = categoryGroups.filter((group) =>
      group.category?.trim()
    );

    return {
      supplierCount,
      countryCount: namedCountries.length,
      categoryCount: namedCategories.length,
      countryCoverage: namedCountries.sort(
        (a, b) =>
          b.supplierCount - a.supplierCount ||
          a.country.localeCompare(b.country)
      ),
    };
  } catch {
    return staticSiteStats();
  }
}

export const getSiteStats = unstable_cache(loadSiteStats, ["site-stats"], {
  revalidate: 3600,
  tags: ["site-stats"],
});
