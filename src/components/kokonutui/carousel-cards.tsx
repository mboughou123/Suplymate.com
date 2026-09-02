"use client";

/**
 * @author: @kokonutui
 * @description: Carousel Cards (wired to real phase-1 mills — no sample data)
 * @version: 1.0.0
 * @license: MIT
 * @website: https://kokonutui.com
 */

import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import { useMemo, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import { getFactoryPhotoUrl, getSupplierLogoUrl } from "@/lib/phase1";
import { cn } from "@/lib/utils";

type CarouselMill = {
  id: string;
  name: string;
  country: string;
  image: string;
  logoUrl?: string;
  rating: number | null;
};

function pickMills(limit = 8): CarouselMill[] {
  const withPhoto: CarouselMill[] = [];
  for (const s of phase1Suppliers) {
    const image = getFactoryPhotoUrl(s);
    if (!image?.startsWith("/images/suppliers/phase1/")) continue;
    withPhoto.push({
      id: s.id,
      name: s.name,
      country: s.country ?? s.location,
      image,
      logoUrl: getSupplierLogoUrl(s),
      rating: s.googleRating ?? s.rating ?? null,
    });
    if (withPhoto.length >= limit) break;
  }
  return withPhoto;
}

type Props = {
  className?: string;
  title?: string;
};

export default function CarouselCards({
  className,
  title = "Phase-1 mills",
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const mills = useMemo(() => pickMills(8), []);

  function scrollBy(dir: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  if (mills.length === 0) return null;

  return (
    <section className={cn("panel-glass p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan">
            Curated factories
          </p>
          <h2 className="text-sm font-bold text-ink">{title}</h2>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-ink-muted transition hover:border-cyan/40 hover:text-navy"
            aria-label="Previous mills"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-ink-muted transition hover:border-cyan/40 hover:text-navy"
            aria-label="Next mills"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {mills.map((m) => (
          <Link
            key={m.id}
            href={`/supplier/${m.id}`}
            className="group w-[240px] shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-cyan/30 hover:shadow-card"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-navy">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.image}
                alt={`${m.name} mill`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
              <p className="absolute bottom-2 left-3 text-[11px] font-bold text-white">
                RFQ
              </p>
            </div>
            <div className="space-y-1 p-3">
              <p className="line-clamp-2 text-sm font-semibold text-ink">
                {m.name}
              </p>
              <p className="inline-flex items-center gap-1 text-[11px] text-ink-dim">
                <MapPin className="h-3 w-3 text-cyan" aria-hidden />
                {m.country}
              </p>
              {m.rating != null && (
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink">
                  <Star className="h-3 w-3 fill-mustard text-mustard" aria-hidden />
                  {m.rating.toFixed(1)}/5
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
