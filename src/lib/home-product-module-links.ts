/**
 * Locale-aware "Read more" targets for homepage Product Modules (Scout / Compare / Watch).
 * Each path must resolve to an existing App Router page under `src/app/[locale]/`.
 */
export const HOME_PRODUCT_MODULE_LINKS = {
  /** Scout — verified supplier directory & shortlist */
  scout: "/suppliers",
  /** Compare — sourcing catalogue to browse and compare offers */
  compare: "/products",
  /** Watch — material price charts & rate signals */
  watch: "/materials",
} as const;

export type HomeProductModuleKey = keyof typeof HOME_PRODUCT_MODULE_LINKS;

/** App Router page files backing each module link (without `[locale]` segment). */
export const HOME_PRODUCT_MODULE_PAGE_FILES: Record<
  HomeProductModuleKey,
  string
> = {
  scout: "src/app/[locale]/suppliers/page.tsx",
  compare: "src/app/[locale]/products/page.tsx",
  watch: "src/app/[locale]/materials/page.tsx",
};
