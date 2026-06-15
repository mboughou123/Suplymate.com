"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type HeroCardProps = {
  icon: LucideIcon;
  iconGradient?: string;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  className?: string;
  /** Float animation phase offset in seconds */
  floatDelay?: number;
};

/**
 * Small floating glass card used around the hero image to suggest live
 * supplier / product / price activity.
 */
export default function HeroCard({
  icon: Icon,
  iconGradient = "from-cyan to-teal",
  title,
  subtitle,
  trailing,
  className = "",
  floatDelay = 0,
}: HeroCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-cardHover backdrop-blur-xl ${className}`}
      animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: floatDelay,
      }}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${iconGradient} text-white shadow-glow`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        <p className="truncate text-xs text-ink-muted">{subtitle}</p>
      </div>
      {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
    </motion.div>
  );
}
