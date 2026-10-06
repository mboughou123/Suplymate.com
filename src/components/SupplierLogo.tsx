"use client";

import { useState } from "react";
import Image from "next/image";
import { isGoogleMapsImageUrl } from "@/lib/image-fallback";
import { LOGO_IMAGE_CLASS, LOGO_INITIALS_CLASS, LOGO_MONO_CLASS, LOGO_TILE_CLASS, logoNeedsMono } from "@/lib/logo-tile";

// Kept in sync with `images.remotePatterns` in next.config.ts.
// Do not send Google Maps / googleusercontent URLs through next/image.
const OPTIMIZED_HOST = /(\.public\.blob\.vercel-storage\.com)$/i;

function canOptimize(src: string): boolean {
  if (src.startsWith("/") && !src.toLowerCase().endsWith(".svg")) return true;
  try {
    const url = new URL(src);
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
  /** Kept so existing call sites compile. Initials sit on the white tile. */
  gradient?: string;
  name: string;
  className?: string;
};

/**
 * Square logo on a white tile. A real logo is contained with padding; a missing
 * logo falls back to initials on the same white tile.
 */
export default function SupplierLogo({
  logoUrl,
  initials,
  gradient: _gradient,
  name,
  className = "h-16 w-16 rounded-2xl text-base ring-4 ring-white shadow-glow",
}: SupplierLogoProps) {
  void _gradient;
  const [failed, setFailed] = useState(false);
  const usableLogo = logoUrl && !isGoogleMapsImageUrl(logoUrl) ? logoUrl : null;
  const showImage = Boolean(usableLogo) && !failed;
  const paintDark = logoNeedsMono(usableLogo);
  return (
    <div
      className={`relative ${LOGO_TILE_CLASS} ${LOGO_INITIALS_CLASS} ${className}`}
      data-logo-tile="white"
      data-logo-mono={paintDark ? "true" : "false"}
    >
      {showImage ? (
        canOptimize(usableLogo as string) ? (
          <Image
            src={usableLogo as string}
            alt={`${name} logo`}
            fill
            sizes="64px"
            className={`${LOGO_IMAGE_CLASS} ${paintDark ? LOGO_MONO_CLASS : ""}`}
            onError={() => setFailed(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={usableLogo as string}
            alt={`${name} logo`}
            loading="lazy"
            decoding="async"
            className={`${LOGO_IMAGE_CLASS} ${paintDark ? LOGO_MONO_CLASS : ""}`}
            onError={() => setFailed(true)}
          />
        )
      ) : (
        initials
      )}
    </div>
  );
}
