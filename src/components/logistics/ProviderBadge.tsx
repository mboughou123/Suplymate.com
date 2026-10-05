import { providerInitials, type LogisticsProvider } from "@/data/logistics-providers";
import { resolveProviderLogo } from "@/data/logistics-provider-logos";

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
  provider: Pick<LogisticsProvider, "company"> & Partial<Pick<LogisticsProvider, "id" | "logo" | "logoOnDark">>;
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
        className={`flex shrink-0 items-center justify-center overflow-hidden border p-1 ${
          logo.logoOnDark ? "border-navy bg-navy" : "border-slate-200 bg-white"
        } ${SIZES[size]}`}
        style={cap}
      >
        {/* Local and published files, including SVG. Served as-is, not redrawn. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo.src}
          alt={`${provider.company} logo`}
          width={logo.maxNativePx}
          height={logo.maxNativePx}
          className="h-full w-full object-contain"
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
      className={`flex shrink-0 items-center justify-center bg-navy font-extrabold tracking-tight text-white ${SIZES[size]}`}
    >
      {providerInitials(provider)}
    </span>
  );
}
