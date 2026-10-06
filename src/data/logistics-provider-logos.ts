// QA-approved logos copied from media-batches/inbox/2026-10-04-logistics-insurance
// (prepared files on cursor/media-batches-2026-10-04-9a1e). They ship in /public
// so the directory can show them before the media-bot upload pipeline is configured.
//
// Roanoke is still omitted: the earlier file was another company's mark, and
// roanokegroup.com did not yield a usable logo from the company site.

export type ProviderLogoAsset = {
  /** Public path, served as the original file (SVG stays SVG). */
  src: string;
  /**
   * White artwork with no coloured file on the company's own site.
   * Rendered on the white tile with a dark mono filter.
   */
  monoOnWhite?: boolean;
  /**
   * Native pixel size of a small raster. The badge must not draw this file
   * larger than this.
   */
  maxNativePx?: number;
};

export const PROVIDER_LOGOS: Record<string, ProviderLogoAsset> = {
  "axa-xl-marine-cargo": {
    src: "/logistics/logos/axa-xl-marine-cargo.png",
  },
  "chubb-worldwide-ocean-cargo": {
    src: "/logistics/logos/chubb-worldwide-ocean-cargo.png",
  },
  "aig-ocean-cargo": {
    src: "/logistics/logos/aig-ocean-cargo.png",
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
    monoOnWhite: true,
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
  loadsure: {
    src: "/logistics/logos/loadsure.png",
  },
  "dsv-cargo-insurance": {
    src: "/logistics/logos/dsv-cargo-insurance.svg",
  },
  "flexport-cargo-insurance": {
    src: "/logistics/logos/flexport-cargo-insurance.svg",
  },
  "expeditors-cargo-insurance": {
    src: "/logistics/logos/expeditors-cargo-insurance.png",
  },
};

/** Still no verified file from the company's own site. */
export const DROPPED_PROVIDER_LOGO_IDS = ["roanoke-cargo-insurance"] as const;

export function getProviderLogo(id: string | null | undefined): ProviderLogoAsset | undefined {
  if (!id) return undefined;
  return PROVIDER_LOGOS[id.trim().toLowerCase()];
}

export type ResolvedProviderLogo = {
  src: string;
  monoOnWhite: boolean;
  maxNativePx?: number;
};

type LogoCarrier = {
  id?: string;
  logo?: string;
  monoOnWhite?: boolean;
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
  const monoOnWhite = Boolean(provider.monoOnWhite || (usingBundled && asset?.monoOnWhite));
  const maxNativePx = usingBundled ? asset?.maxNativePx : undefined;
  return { src, monoOnWhite, ...(maxNativePx != null ? { maxNativePx } : {}) };
}
