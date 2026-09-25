/** Widths next/image may put in srcset. Cap at 1920 — listing cards never need 4K. */
export const IMAGE_DEVICE_SIZES = [384, 640, 750, 828, 1080, 1200, 1920] as const;

/** Extra widths for thumbs / logos (used together with deviceSizes). */
export const IMAGE_INLINE_SIZES = [64, 96, 128, 256] as const;

export const CARD_IMAGE_QUALITY = 70;

export const CARD_IMAGE_SIZES = {
  supplierBanner: "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px",
  productCard: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  productThumb: "120px",
  homeProduct: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  homeSupplier: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
  factoryTile: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  factoryHero: "(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 50vw",
  logo: "64px",
  aboutBanner: "100vw",
} as const;
