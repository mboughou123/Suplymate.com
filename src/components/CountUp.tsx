"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** Numeric portion to animate up to */
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
};

/**
 * Animated stat counter with a bulletproof fallback: the REAL value is
 * server-rendered and shown by default (crawlers, no-JS, pre-hydration,
 * reduced-motion). The 0 → value count-up is a progressive enhancement that
 * only kicks in once the element actually enters the viewport — so the
 * number can never get stuck at "0".
 */
export default function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  durationMs = 1400,
  className = "",
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Default to the final value — never render "0" as a resting state.
  const [display, setDisplay] = useState(value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        hasAnimated.current = true;
        const start = performance.now();
        const animate = (now: number) => {
          const t = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(t < 1 ? value * eased : value);
          if (t < 1) raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      // If unmounted mid-animation, next mount shows the real value again.
      setDisplay(value);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
