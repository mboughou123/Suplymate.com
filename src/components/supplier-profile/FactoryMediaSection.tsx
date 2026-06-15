"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Images,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, reveal } from "./primitives";

export default function FactoryMediaSection({ profile }: { profile: SupplierProfile }) {
  const { media } = profile;
  const [active, setActive] = useState<number | null>(null);

  const close = () => setActive(null);
  const go = (dir: 1 | -1) =>
    setActive((i) => (i === null ? null : (i + dir + media.length) % media.length));

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <SectionHeading
        eyebrow="Facility"
        title="Factory & media gallery"
        description="Production floor, QC labs and logistics — tap any tile for a fullscreen preview."
        icon={<Images className="h-5 w-5" />}
      />

      {media.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
            <Images className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Media coming soon</p>
          <p className="mt-1 max-w-sm text-xs text-ink-muted">
            This supplier hasn&apos;t uploaded factory photos or videos yet. Request media
            directly when you contact them.
          </p>
        </div>
      )}

      <div className="grid auto-rows-[180px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {media.map((m, i) => (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => setActive(i)}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.45 }}
            className={`group relative overflow-hidden rounded-2xl text-left shadow-card ${
              i === 0 ? "col-span-2 row-span-2" : ""
            }`}
            style={{ backgroundImage: m.gradient }}
          >
            <div className="absolute inset-0 ai-grid-bg opacity-20 transition group-hover:scale-110" />
            {m.type === "video" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-cyan shadow-cardHover transition group-hover:scale-110">
                  <Play className="ml-0.5 h-6 w-6 fill-cyan" aria-hidden />
                </span>
              </span>
            )}
            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/20 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3">
              <p className="text-sm font-semibold text-white">{m.title}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {active !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
            onClick={close}
          >
            <button
              onClick={close}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <motion.div
              key={media[active].id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl shadow-cardHover"
              style={{ backgroundImage: media[active].gradient }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 ai-grid-bg opacity-25" />
              {media[active].type === "video" && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-cyan shadow-cardHover">
                    <Play className="ml-1 h-9 w-9 fill-cyan" aria-hidden />
                  </span>
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5">
                <p className="text-lg font-semibold text-white">{media[active].title}</p>
                <p className="text-sm text-white/70">{media[active].caption}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
