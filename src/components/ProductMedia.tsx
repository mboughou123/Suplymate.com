"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, ImageOff } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";

export type ProductMediaKind = "real" | "illustrative" | "none";

type ProductMediaProps = {
  src?: string | null;
  kind: ProductMediaKind;
  alt: string;
  category?: string;
  verified?: boolean;
  className?: string;
  sizes?: string;
};

export default function ProductMedia({
  src,
  kind,
  alt,
  category,
  verified = false,
  className = "h-44",
  sizes,
}: ProductMediaProps) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const showPhoto = kind !== "none" && Boolean(src);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-slate-100 ${className}`}>
      {showPhoto ? (
        <ImageWithFallback
          src={src}
          alt={alt}
          sizes={sizes}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex flex-col items-center gap-1.5 px-4 text-center text-ink-muted">
          <ImageOff className="h-5 w-5 opacity-50" aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-wide">
            {t("noPhoto")}
          </span>
        </div>
      )}
      {kind === "illustrative" && showPhoto && (
        <span className="absolute bottom-3 left-3 rounded-md bg-ink/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {t("illustrativeBadge")}
        </span>
      )}
      {verified && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
          {tc("verified")}
        </span>
      )}
      {category && (
        <span className="absolute right-3 top-3 rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {category}
        </span>
      )}
    </div>
  );
}
