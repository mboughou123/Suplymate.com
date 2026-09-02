"use client";

/**
 * @author: @dorianbaffier
 * @description: Background Paths (canvas layer only — no stock title)
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion } from "framer-motion";
import { memo, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

function generateAestheticPath(
  index: number,
  position: number,
  type: "primary" | "secondary" | "accent"
): string {
  const baseAmplitude =
    type === "primary" ? 150 : type === "secondary" ? 100 : 60;
  const phase = index * 0.2;
  const points: Point[] = [];
  const segments = type === "primary" ? 10 : type === "secondary" ? 8 : 6;
  const startX = 2400;
  const startY = 800;
  const endX = -2400;
  const endY = -800 + index * 25;

  for (let i = 0; i <= segments; i++) {
    const progress = i / segments;
    const eased = 1 - (1 - progress) ** 2;
    const baseX = startX + (endX - startX) * eased;
    const baseY = startY + (endY - startY) * eased;
    const amplitudeFactor = 1 - eased * 0.3;
    const wave1 =
      Math.sin(progress * Math.PI * 3 + phase) *
      (baseAmplitude * 0.7 * amplitudeFactor);
    const wave2 =
      Math.cos(progress * Math.PI * 4 + phase) *
      (baseAmplitude * 0.3 * amplitudeFactor);
    const wave3 =
      Math.sin(progress * Math.PI * 2 + phase) *
      (baseAmplitude * 0.2 * amplitudeFactor);
    points.push({
      x: baseX * position,
      y: baseY + wave1 + wave2 + wave3,
    });
  }

  return points
    .map((point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = points[i - 1];
      const tension = 0.4;
      const cp1x = prev.x + (point.x - prev.x) * tension;
      const cp1y = prev.y;
      const cp2x = prev.x + (point.x - prev.x) * (1 - tension);
      const cp2y = point.y;
      return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    })
    .join(" ");
}

const FloatingPaths = memo(function FloatingPaths({
  position,
}: {
  position: number;
}) {
  const paths = useMemo(() => {
    const make = (
      count: number,
      type: "primary" | "secondary" | "accent",
      opacity0: number,
      width0: number
    ) =>
      Array.from({ length: count }, (_, i) => ({
        id: `${type}-${position}-${i}`,
        d: generateAestheticPath(i, position, type),
        opacity: opacity0 + i * 0.012,
        width: width0 + i * 0.18,
      }));
    return [
      ...make(8, "primary", 0.1, 3.2),
      ...make(8, "secondary", 0.08, 2.4),
      ...make(6, "accent", 0.06, 1.6),
    ];
  }, [position]);

  return (
    <svg
      className="h-full w-full"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      viewBox="-2400 -800 4800 1600"
      aria-hidden
    >
      <defs>
        <linearGradient id={`suplymate-paths-${position}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0d3349" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#0369a1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0ea5b7" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {paths.map((path) => (
        <motion.path
          key={path.id}
          d={path.d}
          stroke={`url(#suplymate-paths-${position})`}
          strokeLinecap="round"
          strokeWidth={path.width}
          style={{ opacity: path.opacity }}
          initial={{ opacity: 0 }}
          animate={{ opacity: path.opacity, y: [0, -10, 0] }}
          transition={{
            opacity: { duration: 1.2 },
            y: {
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              repeatType: "reverse",
            },
          }}
        />
      ))}
    </svg>
  );
});

type Props = {
  className?: string;
  children?: ReactNode;
};

/** Subtle navy/azure path field. Never ships the stock "Background Paths" title. */
export default memo(function BackgroundPaths({ className, children }: Props) {
  return (
    <div className={cn("relative isolate", className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 opacity-70">
          <FloatingPaths position={1} />
        </div>
        <div className="absolute inset-0 opacity-50">
          <FloatingPaths position={-1} />
        </div>
      </div>
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
});
