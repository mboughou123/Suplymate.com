import { providerInitials, type LogisticsProvider } from "@/data/logistics-providers";

const SIZES = {
  sm: "h-9 w-9 rounded-lg text-xs",
  md: "h-12 w-12 rounded-xl text-sm",
  lg: "h-16 w-16 rounded-2xl text-lg",
} as const;

export default function ProviderBadge({
  provider,
  size = "md",
}: {
  provider: Pick<LogisticsProvider, "company">;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center bg-navy font-extrabold tracking-tight text-white ${SIZES[size]}`}
    >
      {providerInitials(provider)}
    </span>
  );
}
