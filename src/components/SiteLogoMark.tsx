import Image from "next/image";
import { SITE_MASCOT } from "@/lib/brand";

type SiteLogoMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  /** Empty when the wordmark sits next to the mark. */
  alt?: string;
};

export default function SiteLogoMark({
  size = 32,
  className = "h-8 w-8 rounded-md bg-white object-contain",
  priority = false,
  alt = "",
}: SiteLogoMarkProps) {
  return (
    <Image
      src={SITE_MASCOT.src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
