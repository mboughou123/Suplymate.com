"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  ShieldCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  ExternalLink,
  Maximize2,
  X,
} from "lucide-react";
import Image from "next/image";
import type { Certification, SupplierProfile } from "@/lib/supplier-profile";
import { SectionHeading, reveal } from "./primitives";

/** Certificate scan thumbnail — degrades to the shield tile if the file 404s. */
function CertThumb({
  cert,
  alt,
  onOpen,
  openLabel,
}: {
  cert: Certification;
  alt: string;
  onOpen: () => void;
  openLabel: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!cert.imageUrl || broken) {
    return (
      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-slate-50 to-cyan/5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card">
          <ShieldCheck
            className={`h-8 w-8 ${cert.verified ? "text-emerald-600" : "text-ink-dim"}`}
            aria-hidden
          />
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group/thumb relative block h-40 w-full overflow-hidden bg-slate-50"
      aria-label={openLabel}
    >
      <Image
        src={cert.imageUrl}
        alt={alt}
        fill
        sizes="288px"
        className="object-contain p-2 transition duration-300 group-hover/thumb:scale-[1.03]"
        onError={() => setBroken(true)}
      />
      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/25 text-white opacity-0 backdrop-blur transition group-hover/thumb:opacity-100">
        <Maximize2 className="h-3.5 w-3.5" aria-hidden />
      </span>
    </button>
  );
}

export default function CertificationsSection({ profile }: { profile: SupplierProfile }) {
  const t = useTranslations("supplierProfile");
  const common = useTranslations("common");
  const { certifications } = profile;
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const isReal = certifications.some((c) => c.isReal);
  const withImages = certifications.filter((c) => c.imageUrl);

  function scrollBy(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  const close = () => setActive(null);
  const go = (dir: 1 | -1) =>
    setActive((i) => (i === null ? null : (i + dir + withImages.length) % withImages.length));

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, withImages.length]);

  const altFor = (c: Certification) => t("certificateImageAlt", { name: c.name, authority: c.authority });

  return (
    <motion.section {...reveal} transition={{ duration: 0.6 }} className="py-8 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          eyebrow={t("complianceEyebrow")}
          title={t("certificationsTitle")}
          description={isReal ? t("realCertificationsDescription") : t("certificationsDescription")}
          icon={<Award className="h-5 w-5" />}
        />
        <div className="mb-6 hidden gap-2 sm:flex">
          <button
            onClick={() => scrollBy(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition hover:border-cyan/40 hover:text-cyan"
            aria-label={t("previousCertifications")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-ink-muted transition hover:border-cyan/40 hover:text-cyan"
            aria-label={t("nextCertifications")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isReal && (
        <p className="-mt-2 mb-4 rounded-lg bg-cyan-soft px-3 py-2 text-xs text-cyan">
          {t("displayedBySupplier")}
        </p>
      )}

      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {certifications.map((c, i) => {
          const imageIndex = c.imageUrl ? withImages.indexOf(c) : -1;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.45 }}
              className="group relative flex w-72 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-cardHover"
            >
              <div className="relative">
                <CertThumb
                  cert={c}
                  alt={altFor(c)}
                  onOpen={() => setActive(imageIndex)}
                  openLabel={`${t("viewCertificate")}: ${c.name}`}
                />
                {c.verified && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <BadgeCheck className="h-3 w-3" aria-hidden /> {common("verified")}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-base font-bold text-ink">{c.code}</p>
                <p className="text-xs text-ink-muted" title={c.name}>
                  {c.name}
                </p>
                <dl className="mt-3 space-y-1 text-[11px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-dim">{t("authority")}</dt>
                    <dd className="text-right font-medium text-ink">{c.authority}</dd>
                  </div>
                  {!c.isReal && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-ink-dim">{t("issued")}</dt>
                        <dd className="font-medium text-ink">{c.issued}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-dim">{t("validUntil")}</dt>
                        <dd className="font-medium text-ink">{c.expiry}</dd>
                      </div>
                    </>
                  )}
                </dl>
                <div className="mt-auto flex gap-2 pt-4">
                  {c.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setActive(imageIndex)}
                      className="btn-secondary flex-1 justify-center !py-2 text-xs"
                    >
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden /> {t("viewCertificate")}
                    </button>
                  ) : c.isReal ? null : (
                    <button
                      type="button"
                      className="btn-secondary flex-1 justify-center !py-2 text-xs"
                      title={t("certificateOnRequest")}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden /> {t("download")}
                    </button>
                  )}
                  {c.sourceUrl && (
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-ink-muted transition hover:border-cyan/40 hover:text-cyan"
                      title={t("certificateSource")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only sm:not-sr-only">{t("certificateSource")}</span>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {active !== null && withImages[active] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={altFor(withImages[active])}
          >
            <button
              onClick={close}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label={t("closeCertificate")}
            >
              <X className="h-5 w-5" />
            </button>
            {withImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
                  aria-label={common("prev")}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
                  aria-label={common("next")}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <motion.figure
              key={withImages[active].id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-cardHover"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-[70vh] w-full bg-slate-50">
                <Image
                  src={withImages[active].imageUrl as string}
                  alt={altFor(withImages[active])}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-contain p-3"
                />
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                <div>
                  <p className="text-sm font-bold text-ink">{withImages[active].name}</p>
                  <p className="text-xs text-ink-muted">{withImages[active].authority}</p>
                </div>
                {withImages[active].sourceUrl && (
                  <a
                    href={withImages[active].sourceUrl as string}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan hover:underline"
                  >
                    {t("certificateSource")} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
