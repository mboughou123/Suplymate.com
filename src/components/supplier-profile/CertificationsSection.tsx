"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Award,
  ShieldCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import type { SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, reveal } from "./primitives";

export default function CertificationsSection({ profile }: { profile: SupplierProfile }) {
  const { certifications } = profile;
  const scroller = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Compliance"
          title="Certifications & audits"
          description="Independently issued certificates verified against issuing authorities."
          icon={<Award className="h-5 w-5" />}
        />
        <div className="mb-6 hidden gap-2 sm:flex">
          <button
            onClick={() => scrollBy(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition hover:border-cyan/40 hover:text-cyan"
            aria-label="Previous certifications"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition hover:border-cyan/40 hover:text-cyan"
            aria-label="Next certifications"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {certifications.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.45 }}
            className="group relative w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-cardHover"
          >
            <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-slate-50 to-cyan/5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card">
                <ShieldCheck
                  className={`h-8 w-8 ${c.verified ? "text-emerald-600" : "text-ink-dim"}`}
                  aria-hidden
                />
              </div>
              {c.verified && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <BadgeCheck className="h-3 w-3" aria-hidden /> Verified
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="text-base font-bold text-ink">{c.code}</p>
              <p className="text-xs text-ink-muted">{c.name}</p>
              <dl className="mt-3 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <dt className="text-ink-dim">Authority</dt>
                  <dd className="font-medium text-ink">{c.authority}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-dim">Issued</dt>
                  <dd className="font-medium text-ink">{c.issued}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-dim">Valid until</dt>
                  <dd className="font-medium text-ink">{c.expiry}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="btn-secondary mt-4 w-full justify-center !py-2 text-xs"
                title="Certificate available on request"
              >
                <Download className="h-3.5 w-3.5" aria-hidden /> Download
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
