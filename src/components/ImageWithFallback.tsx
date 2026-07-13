"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { GENERIC_PRODUCT_PLACEHOLDER } from "@/lib/image-fallback";

// Hosts allowed through the Next.js image optimizer (kept in sync with
// `images.remotePatterns` in next.config.ts). Remote photos from these hosts
// are proxied, resized, and served as WebP/AVIF from our own edge cache
// instead of hotlinking the third-party origin.
const OPTIMIZED_HOST = /(\.googleusercontent\.com|^streetviewpixels-pa\.googleapis\.com$|\.public\.blob\.vercel-storage\.com)$/i;

function canOptimize(src: string): boolean {
  if (src.startsWith("/")) {
    // Local branded fallbacks are SVG — serve them as-is (no optimizer pass).
    return !src.toLowerCase().endsWith(".svg");
  }
  try {
    const url = new URL(src);
    return url.protocol === "https:" && OPTIMIZED_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

type ImageWithFallbackProps = {
  /** Primary image (real DB / scraped image). May be undefined/empty. */
  src?: string | null;
  /** Category-based fallback (e.g. from getProductFallbackImage). */
  fallbackSrc?: string;
  /**
   * Final generic placeholder. Defaults to the Suplymate product placeholder;
   * pass GENERIC_SUPPLIER_PLACEHOLDER for supplier surfaces.
   */
  placeholderSrc?: string;
  /** Required for accessibility. */
  alt: string;
  className?: string;
  /** Loading strategy — defaults to lazy. */
  loading?: "lazy" | "eager";
  /** Responsive sizes hint. */
  sizes?: string;
  /** Optional decoding hint. */
  decoding?: "async" | "auto" | "sync";
};

/**
 * Image that walks a fallback chain on error:
 *   src → fallbackSrc → placeholderSrc.
 * Remote photos from allowlisted hosts render through next/image (optimized +
 * cached through our deployment); local SVG fallbacks and unknown hosts render
 * as plain <img>. The final placeholder is a LOCAL asset, so the result is
 * never broken/empty.
 */
export default function ImageWithFallback({
  src,
  fallbackSrc,
  placeholderSrc = GENERIC_PRODUCT_PLACEHOLDER,
  alt,
  className = "",
  loading = "lazy",
  sizes,
  decoding = "async",
}: ImageWithFallbackProps) {
  // Ordered, de-duplicated, non-empty chain of candidate sources.
  const chain = useMemo(() => {
    const candidates = [src, fallbackSrc, placeholderSrc].filter(
      (s): s is string => Boolean(s && s.trim())
    );
    const seen = new Set<string>();
    const unique = candidates.filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
    return unique.length > 0 ? unique : [placeholderSrc];
  }, [src, fallbackSrc, placeholderSrc]);

  const [index, setIndex] = useState(0);
  const current = chain[Math.min(index, chain.length - 1)];
  const advance = () => setIndex((i) => (i < chain.length - 1 ? i + 1 : i));

  if (canOptimize(current)) {
    return (
      <Image
        src={current}
        alt={alt}
        fill
        {...(loading === "eager" ? { priority: true } : { loading })}
        sizes={sizes ?? "100vw"}
        className={className}
        onError={advance}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading={loading}
      decoding={decoding}
      sizes={sizes}
      className={className}
      onError={advance}
    />
  );
}
