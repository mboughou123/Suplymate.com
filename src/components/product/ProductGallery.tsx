"use client";

import { useState } from "react";
import { Play, Maximize2 } from "lucide-react";
import type { GalleryImage } from "@/lib/product-detail";
import { PRODUCT_ICONS } from "@/components/product/productIcons";

export default function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  const Icon = PRODUCT_ICONS[current.icon];

  return (
    <div className="lg:sticky lg:top-24">
      {/* Main view */}
      <div
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200"
        style={{ backgroundImage: current.gradient }}
      >
        <div className="absolute inset-0 ai-grid-bg opacity-30" />
        {current.isVideo ? (
          <button
            type="button"
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform hover:scale-105"
            aria-label="Play factory video"
          >
            <Play className="h-9 w-9 fill-white text-white" aria-hidden />
          </button>
        ) : (
          <Icon className="relative h-28 w-28 text-white/90" strokeWidth={1.25} aria-hidden />
        )}
        <span className="absolute left-4 top-4 rounded-md bg-black/35 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
          {current.label}
        </span>
        <span className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md bg-black/35 text-white backdrop-blur">
          <Maximize2 className="h-4 w-4" aria-hidden />
        </span>
      </div>

      {/* Thumbnails */}
      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
        {images.map((img, i) => {
          const Thumb = PRODUCT_ICONS[img.icon];
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 transition-all ${
                i === active ? "border-cyan" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundImage: img.gradient }}
              aria-label={`View ${img.label}`}
            >
              {img.isVideo ? (
                <Play className="h-5 w-5 fill-white text-white" aria-hidden />
              ) : (
                <Thumb className="h-6 w-6 text-white/90" strokeWidth={1.5} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
