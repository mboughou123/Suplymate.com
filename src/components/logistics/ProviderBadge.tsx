import { providerInitials, type LogisticsProvider } from "@/data/logistics-providers";

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
  provider: Pick<LogisticsProvider, "company">;
  size?: keyof typeof SIZES;
  /** Admin-published logo from the media library; initials otherwise. */
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      <span aria-hidden className={`flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white p-1 ${SIZES[size]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="h-full w-full object-contain" loading="lazy" decoding="async" />
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
