import { providerInitials, type LogisticsProvider } from "@/data/logistics-providers";
import { resolveProviderLogo } from "@/data/logistics-provider-logos";
import { LOGO_IMAGE_CLASS, LOGO_INITIALS_CLASS, LOGO_MONO_CLASS, LOGO_TILE_CLASS } from "@/lib/logo-tile";

const SIZES = {
  sm: "h-9 w-9 rounded-lg text-xs",
  md: "h-12 w-12 rounded-xl text-sm",
  lg: "h-16 w-16 rounded-2xl text-lg",
} as const;

export default function ProviderBadge({
  provider,
  size = "md",
  logoUrl,
}: {
  provider: Pick<LogisticsProvider, "company"> & Partial<Pick<LogisticsProvider, "id" | "logo">>;
  size?: keyof typeof SIZES;
  /** Admin-published logo from the media library; bundled file otherwise. */
  logoUrl?: string | null;
}) {
  const logo = resolveProviderLogo(provider, logoUrl);
  if (logo) {
    const cap =
      logo.maxNativePx != null ? { maxWidth: logo.maxNativePx, maxHeight: logo.maxNativePx } : undefined;
    return (
      <span
        className={`${LOGO_TILE_CLASS} ${SIZES[size]}`}
        style={cap}
        data-logo-tile="white"
        data-logo-mono={logo.monoOnWhite ? "true" : "false"}
      >
        {/* Local and published files, including SVG. Served as-is, not redrawn. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt={`${provider.company} logo`}
          width={logo.maxNativePx}
          height={logo.maxNativePx}
          className={`${LOGO_IMAGE_CLASS} ${logo.monoOnWhite ? LOGO_MONO_CLASS : ""}`}
          style={cap}
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      data-logo-tile="white"
      className={`${LOGO_TILE_CLASS} ${LOGO_INITIALS_CLASS} ${SIZES[size]}`}
    >
      {providerInitials(provider)}
    </span>
  );
}
