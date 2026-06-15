"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type AnimatedSectionProps = {
  children: ReactNode;
  className?: string;
  /** Delay before the animation starts (seconds) */
  delay?: number;
  /** Animation direction */
  from?: "up" | "down" | "left" | "right" | "scale";
  as?: "div" | "section" | "article" | "li" | "span";
};

const OFFSET = 28;

function buildVariants(from: NonNullable<AnimatedSectionProps["from"]>): Variants {
  const hidden: Record<string, number> = { opacity: 0 };
  if (from === "up") hidden.y = OFFSET;
  if (from === "down") hidden.y = -OFFSET;
  if (from === "left") hidden.x = OFFSET;
  if (from === "right") hidden.x = -OFFSET;
  if (from === "scale") hidden.scale = 0.94;

  return {
    hidden,
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };
}

/**
 * Reusable scroll-reveal wrapper built on Framer Motion. Animates its content
 * into view once, respecting reduced-motion preferences.
 */
export default function AnimatedSection({
  children,
  className = "",
  delay = 0,
  from = "up",
  as = "div",
}: AnimatedSectionProps) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduceMotion) {
    const Tag = as as React.ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={buildVariants(from)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}
