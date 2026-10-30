"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";

const VIDEO_SRC = "/video/suplymate-intro.mp4";
const POSTER_SRC = "/video/suplymate-intro-poster.jpg";

/**
 * Homepage demo video, directly under the hero.
 * - The <video> has no src until it is near the viewport, so it never competes with LCP.
 * - Muted autoplay + loop only while in view (and not under prefers-reduced-motion).
 * - "Play with sound" unmutes, restarts from 0 and hands over to native controls.
 */
export default function HomeDemoVideo() {
  const t = useTranslations("homeDemoVideo");
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [withSound, setWithSound] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Attach the source only once the frame is close to the viewport.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || src) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSrc(VIDEO_SRC);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  // Muted preview: play while visible, pause when scrolled away.
  useEffect(() => {
    const el = frameRef.current;
    const video = videoRef.current;
    if (!el || !video || !src) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!withSound && !reduced) video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, withSound, reduced]);

  const playWithSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.src) video.src = VIDEO_SRC;
    setSrc(VIDEO_SRC);
    setWithSound(true);
    video.loop = false;
    video.muted = false;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, []);

  return (
    <section
      id="demo"
      aria-labelledby="home-demo-heading"
      className="relative overflow-hidden bg-[#050B12] pb-20 pt-4 text-white sm:pb-24 lg:pb-28 scroll-mt-28"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[min(1100px,92vw)] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.18),transparent_65%)] blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="container-page relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-glow">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-glow" />
            {t("eyebrow")}
          </p>
          <h2 id="home-demo-heading" className="mt-4 font-display text-3xl font-semibold tracking-tight text-white text-balance sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base text-white/65 sm:text-lg">{t("subtitle")}</p>
        </div>

        <div className="mx-auto mt-10 max-w-[1100px] sm:mt-12">
          <div className="rounded-[1.25rem] bg-gradient-to-b from-cyan-glow/40 via-white/10 to-white/5 p-px shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_80px_-20px_rgba(14,165,233,0.35),0_12px_32px_-12px_rgba(0,0,0,0.6)] sm:rounded-[1.5rem]">
            <div
              ref={frameRef}
              className="group relative aspect-video overflow-hidden rounded-[calc(1.25rem-1px)] bg-[#07121c] sm:rounded-[calc(1.5rem-1px)]"
            >
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                src={src}
                poster={POSTER_SRC}
                preload="metadata"
                playsInline
                muted={!withSound}
                loop={!withSound}
                controls={withSound}
                aria-label={t("videoLabel")}
              />

              {!withSound && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[#050B12]/70 via-[#050B12]/10 to-transparent transition-colors duration-300 group-hover:from-[#050B12]/80">
                  <button
                    type="button"
                    onClick={playWithSound}
                    className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 py-2 pl-2 pr-5 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(14,165,233,0.6)] backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-cyan-glow/50 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow sm:gap-4 sm:py-2.5 sm:pl-2.5 sm:pr-6 sm:text-base"
                  >
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-cyan-glow text-[#050B12] sm:h-12 sm:w-12">
                      <span aria-hidden className="absolute inset-0 rounded-full bg-cyan-glow/50 motion-safe:animate-ping" />
                      <Play className="relative ml-0.5 h-4 w-4 fill-current sm:h-5 sm:w-5" />
                    </span>
                    {t("playWithSound")}
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur sm:bottom-4 sm:right-4 sm:text-xs">
                    {t("duration")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
