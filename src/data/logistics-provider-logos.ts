// QA-approved logos copied from media-batches/inbox/2026-10-04-logistics-insurance
// (prepared files on cursor/media-batches-2026-10-04-9a1e). They ship in /public
// so the directory can show them before the media-bot upload pipeline is configured.
//
// Left out on purpose (researcher QA: wrong company):
// loadsure, flexport-cargo-insurance, roanoke-cargo-insurance.

export type ProviderLogoAsset = {
  /** Public path, served as the original file (SVG stays SVG). */
  src: string;
  /** White artwork that needs a dark tile. */
  logoOnDark?: boolean;
  /**
   * Native pixel size of a small raster. The badge must not draw this file
   * larger than this (AIG's mark is only 89px).
   */
  maxNativePx?: number;
};

export const PROVIDER_LOGOS: Record<string, ProviderLogoAsset> = {
  "axa-xl-marine-cargo": {
    src: "/logistics/logos/axa-xl-marine-cargo.png",
    logoOnDark: true,
  },
  "chubb-worldwide-ocean-cargo": {
    src: "/logistics/logos/chubb-worldwide-ocean-cargo.png",
  },
  "aig-ocean-cargo": {
    src: "/logistics/logos/aig-ocean-cargo.png",
    logoOnDark: true,
    maxNativePx: 89,
  },
  "tokio-marine-hcc-marine-cargo": {
    src: "/logistics/logos/tokio-marine-hcc-marine-cargo.png",
  },
  "hdi-global-marine-cargo": {
    src: "/logistics/logos/hdi-global-marine-cargo.svg",
  },
  "liberty-specialty-markets-marine-cargo": {
    src: "/logistics/logos/liberty-specialty-markets-marine-cargo.png",
  },
  "travelers-ocean-cargo": {
    src: "/logistics/logos/travelers-ocean-cargo.svg",
  },
  "the-hartford-ocean-cargo": {
    src: "/logistics/logos/the-hartford-ocean-cargo.png",
  },
  "beazley-marine-cargo": {
    src: "/logistics/logos/beazley-marine-cargo.png",
  },
  "qbe-marine-cargo": {
    src: "/logistics/logos/qbe-marine-cargo.svg",
    logoOnDark: true,
  },
  "swiss-re-corporate-solutions-brasil-cargo": {
    src: "/logistics/logos/swiss-re-corporate-solutions-brasil-cargo.png",
  },
  "ms-amlin-marine-cargo": {
    src: "/logistics/logos/ms-amlin-marine-cargo.png",
  },
  "markel-international-marine-cargo": {
    src: "/logistics/logos/markel-international-marine-cargo.svg",
  },
  "hiscox-marine-cargo": {
    src: "/logistics/logos/hiscox-marine-cargo.svg",
  },
  "avalon-cargo-insurance": {
    src: "/logistics/logos/avalon-cargo-insurance.png",
    logoOnDark: true,
  },
  "kuehne-nagel-cargo-insurance": {
    src: "/logistics/logos/kuehne-nagel-cargo-insurance.png",
  },
  "ch-robinson-marine-cargo-insurance": {
    src: "/logistics/logos/ch-robinson-marine-cargo-insurance.png",
  },
  "livingston-cargo-insurance": {
    src: "/logistics/logos/livingston-cargo-insurance.png",
  },
};

/** Researcher QA drops. These ids must never gain a bundled logo. */
export const DROPPED_PROVIDER_LOGO_IDS = [
  "loadsure",
  "flexport-cargo-insurance",
  "roanoke-cargo-insurance",
] as const;

export function getProviderLogo(id: string | null | undefined): ProviderLogoAsset | undefined {
  if (!id) return undefined;
  return PROVIDER_LOGOS[id.trim().toLowerCase()];
}

export type ResolvedProviderLogo = {
  src: string;
  logoOnDark: boolean;
  maxNativePx?: number;
};

type LogoCarrier = {
  id?: string;
  logo?: string;
  logoOnDark?: boolean;
};

/**
 * Published media-library URL wins when one exists. Otherwise the bundled
 * public file is used. Dark-tile and native-size limits stay attached to the
 * bundled asset so a later upload is not forced into the 89px cap.
 */
export function resolveProviderLogo(
  provider: LogoCarrier,
  publishedUrl?: string | null,
): ResolvedProviderLogo | null {
  const asset = getProviderLogo(provider.id);
  const published = publishedUrl?.trim() || "";
  const bundledSrc = provider.logo || asset?.src || "";
  const src = published || bundledSrc;
  if (!src) return null;
  const usingBundled = !published || published === bundledSrc;
  const logoOnDark = Boolean(provider.logoOnDark || asset?.logoOnDark);
  const maxNativePx = usingBundled ? asset?.maxNativePx : undefined;
  return { src, logoOnDark, ...(maxNativePx != null ? { maxNativePx } : {}) };
}
