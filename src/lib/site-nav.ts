/**
 * Site-wide navigation model shared by the dark `Navbar` and the homepage
 * `HomeTopNav`, so both render the same top-level items and mega-menus.
 *
 * Framework-free on purpose: labels are i18n keys inside the `megaMenu`
 * namespace (or literal `label`s for data-driven entries such as industries
 * and materials) and icons are string ids resolved by the MegaMenu component.
 */
import { INDUSTRIES } from "@/data/industries";
import { MATERIAL_CATALOG } from "@/data/material-catalog";
import { HOME_PRODUCT_MODULE_LINKS } from "@/lib/home-product-module-links";

export type NavIcon =
  | "sparkles"
  | "binoculars"
  | "columns"
  | "lineChart"
  | "factory"
  | "boxes"
  | "target"
  | "building"
  | "newspaper"
  | "briefcase"
  | "mail";

export type NavLink = {
  href: string;
  /** i18n key inside `megaMenu` — use instead of `label` for translated copy. */
  labelKey?: string;
  /** Literal label for data-driven entries (industry / material names). */
  label?: string;
  /** Optional one-line description (i18n key inside `megaMenu`). */
  descriptionKey?: string;
  icon?: NavIcon;
};

export type NavColumn = {
  titleKey: string;
  links: NavLink[];
};

export type ProductsMenu = {
  kind: "products";
  id: "products";
  labelKey: string;
  intro: {
    headingKey: string;
    bodyKey: string;
    primary: NavLink;
    secondary: NavLink;
  };
  featured: NavLink & { titlePrefixKey: string; titleAccentKey: string; titleSuffixKey: string; blurbKey: string };
  modules: NavLink[];
};

export type ColumnsMenu = {
  kind: "columns";
  id: string;
  labelKey: string;
  columns: NavColumn[];
};

export type ListMenu = {
  kind: "list";
  id: string;
  labelKey: string;
  links: NavLink[];
};

export type PlainLink = {
  kind: "link";
  id: string;
  labelKey: string;
  href: string;
};

export type NavItem = ProductsMenu | ColumnsMenu | ListMenu | PlainLink;

/** Number of data-driven entries shown per Solutions column. */
export const SOLUTIONS_COLUMN_SIZE = 6;

/** Materials picked for the "By material" column (all present in MATERIAL_CATALOG). */
const SOLUTION_MATERIAL_IDS = ["steel", "stainless-steel", "aluminum", "copper", "cement", "plastics-index"];

/** Deep link into the supplier directory pre-filtered to an industry. */
export function supplierIndustryHref(industryId: string): string {
  return `/suppliers?industry=${encodeURIComponent(industryId)}`;
}

/** Deep link into the materials page with a material pre-selected. */
export function materialHref(materialId: string): string {
  return `/materials?m=${encodeURIComponent(materialId)}`;
}

export const PRODUCTS_MENU: ProductsMenu = {
  kind: "products",
  id: "products",
  labelKey: "top.products",
  intro: {
    headingKey: "products.heading",
    bodyKey: "products.body",
    primary: { href: "/products", labelKey: "products.explore" },
    secondary: { href: "/#ai-demo-walkthrough", labelKey: "products.howItWorks" },
  },
  featured: {
    href: "/ai-assistant",
    icon: "sparkles",
    titlePrefixKey: "products.featuredPrefix",
    titleAccentKey: "products.featuredAccent",
    titleSuffixKey: "products.featuredSuffix",
    blurbKey: "products.featuredBlurb",
    labelKey: "products.readMore",
  },
  modules: [
    {
      href: HOME_PRODUCT_MODULE_LINKS.scout,
      icon: "binoculars",
      labelKey: "products.scout",
      descriptionKey: "products.scoutDescription",
    },
    {
      href: HOME_PRODUCT_MODULE_LINKS.compare,
      icon: "columns",
      labelKey: "products.compare",
      descriptionKey: "products.compareDescription",
    },
    {
      href: HOME_PRODUCT_MODULE_LINKS.watch,
      icon: "lineChart",
      labelKey: "products.watch",
      descriptionKey: "products.watchDescription",
    },
    {
      // Homepage "Products" band (photo grid of listed catalogue SKUs).
      href: "/#products",
      icon: "boxes",
      labelKey: "products.catalogue",
      descriptionKey: "products.catalogueDescription",
    },
  ],
};

export const SOLUTIONS_MENU: ColumnsMenu = {
  kind: "columns",
  id: "solutions",
  labelKey: "top.solutions",
  columns: [
    {
      titleKey: "solutions.byIndustry",
      links: INDUSTRIES.slice(0, SOLUTIONS_COLUMN_SIZE).map((industry) => ({
        href: supplierIndustryHref(industry.id),
        label: industry.name,
      })),
    },
    {
      titleKey: "solutions.byMaterial",
      links: SOLUTION_MATERIAL_IDS.map((id) => MATERIAL_CATALOG.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .slice(0, SOLUTIONS_COLUMN_SIZE)
        .map((m) => ({ href: materialHref(m.id), label: m.name })),
    },
    {
      titleKey: "solutions.byGoal",
      links: [
        { href: "/suppliers", labelKey: "solutions.goals.findVerified" },
        { href: "/products", labelKey: "solutions.goals.compareOffers" },
        { href: "/materials", labelKey: "solutions.goals.timePurchase" },
        { href: "/suppliers", labelKey: "solutions.goals.sourceInternationally" },
        { href: "/suppliers", labelKey: "solutions.goals.sourceDomestically" },
        { href: "/ai-assistant", labelKey: "solutions.goals.askMate" },
      ],
    },
  ],
};

export const COMPANY_MENU: ListMenu = {
  kind: "list",
  id: "company",
  labelKey: "top.company",
  links: [
    { href: "/about", labelKey: "company.about", icon: "building" },
    { href: "/blog", labelKey: "company.blog", icon: "newspaper" },
    { href: "/careers", labelKey: "company.careers", icon: "briefcase" },
    { href: "/contact", labelKey: "company.contact", icon: "mail" },
  ],
};

/** Top-level navigation, in display order. */
export const SITE_NAV: NavItem[] = [
  PRODUCTS_MENU,
  SOLUTIONS_MENU,
  { kind: "link", id: "suppliers", labelKey: "top.suppliers", href: "/suppliers" },
  { kind: "link", id: "materials", labelKey: "top.materials", href: "/materials" },
  { kind: "link", id: "pricing", labelKey: "top.pricing", href: "/pricing" },
  COMPANY_MENU,
];

/** Every link inside a nav item (used for active-state detection and tests). */
export function navItemLinks(item: NavItem): NavLink[] {
  switch (item.kind) {
    case "link":
      return [{ href: item.href, labelKey: item.labelKey }];
    case "list":
      return item.links;
    case "columns":
      return item.columns.flatMap((c) => c.links);
    case "products":
      return [item.intro.primary, item.intro.secondary, item.featured, ...item.modules];
  }
}

/** Pathname (no query/hash) of a nav href, for matching against the current route. */
export function navHrefPathname(href: string): string {
  return href.split(/[?#]/)[0] || "/";
}
