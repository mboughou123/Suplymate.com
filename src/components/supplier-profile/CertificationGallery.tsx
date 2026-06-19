"use client";

import { useState } from "react";
import { Award, ShieldCheck, ExternalLink, ImageOff } from "lucide-react";
import type { CertificationDetail } from "@/lib/supplier-normalize";

type Props = {
  /** Certification badge / certificate image URLs. */
  images?: string[];
  /** Structured certification details (name/type/links). */
  certifications?: CertificationDetail[];
  className?: string;
};

/** Image that gracefully degrades to a shield placeholder when it fails. */
function CertImage({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-cyan/5">
        <ShieldCheck className="h-8 w-8 text-emerald-600/70" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className="h-28 w-full rounded-xl border border-slate-200 bg-white object-contain p-2"
    />
  );
}

/**
 * Gallery of certification badges + details. Renders nothing intrusive when a
 * supplier has no certifications (shows a tidy empty state instead of breaking).
 */
export default function CertificationGallery({ images = [], certifications = [], className = "" }: Props) {
  const hasImages = images.length > 0;
  const hasDetails = certifications.length > 0;

  if (!hasImages && !hasDetails) {
    return (
      <div className={`rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center ${className}`}>
        <Award className="mx-auto h-6 w-6 text-ink-dim" aria-hidden />
        <p className="mt-2 text-sm text-ink-muted">No certifications on file yet.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {hasImages && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((src, i) => (
            <CertImage key={`${src}-${i}`} src={src} alt={`Certification ${i + 1}`} />
          ))}
        </div>
      )}

      {hasDetails && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {certifications.map((c, i) => {
            const href = c.certificateUrl || c.sourceUrl || undefined;
            const inner = (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                <span className="font-semibold text-ink">{c.name}</span>
                {c.type && <span className="text-ink-dim">· {c.type}</span>}
                {href && <ExternalLink className="h-3 w-3 text-ink-dim" aria-hidden />}
              </>
            );
            const base =
              "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs";
            return (
              <li key={`${c.name}-${i}`}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={`${base} hover:border-cyan/40`}>
                    {inner}
                  </a>
                ) : (
                  <span className={base}>{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!hasImages && hasDetails && (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-ink-dim">
          <ImageOff className="h-3 w-3" aria-hidden /> Certificate images not provided.
        </p>
      )}
    </div>
  );
}
