"use client";

import { useState } from "react";
import Image from "next/image";

// Kept in sync with `images.remotePatterns` in next.config.ts.
const OPTIMIZED_HOST =
  /(\.googleusercontent\.com|^streetviewpixels-pa\.googleapis\.com$|\.public\.blob\.vercel-storage\.com|\.ajsteel\.com|\.imimg\.com|\.made-in-china\.com|\.contentstack\.io|\.amazonaws\.com)$/i;

function canOptimize(src: string): boolean {
  if (src.startsWith("/")) {
    return !src.toLowerCase().endsWith(".svg");
  }
  try {
    const url = new URL(src, "http://local");
    return url.protocol === "https:" && OPTIMIZED_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

type SupplierLogoProps = {
  /** Real logo image (DB/CDN); may be empty. */
  logoUrl?: string | null;
  /** Initials shown when no logo image / on error. */
  initials: string;
  /** Inline CSS gradient for the avatar background. */
  gradient: string;
  name: string;
  className?: string;
};

/**
 * Circular logo avatar that shows the real logo image when available and
 * gracefully falls back to initials on missing/broken images — so a supplier
 * logo is never empty or broken. Never invents or substitutes product photos.
 */
export default function SupplierLogo({
  logoUrl,
  initials,
  gradient,
  name,
  className = "h-16 w-16 rounded-full text-base ring-4 ring-white shadow-glow",
}: SupplierLogoProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden font-bold tracking-wide text-white ${className}`}
      style={
        showImage
          ? { backgroundColor: "#ffffff" }
          : { backgroundImage: gradient }
      }
    >
      {showImage ? (
        canOptimize(logoUrl as string) ? (
          <Image
            src={logoUrl as string}
            alt={`${name} logo`}
            fill
            sizes="64px"
            className="object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl as string}
            alt={`${name} logo`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        )
      ) : (
        initials
      )}
    </div>
  );
}
