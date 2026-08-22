"use client";

import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";

type TiltCardProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/**
 * Linked card with a hover lift. The previous 3D pointer-follow tilt was
 * retired — Phase 4b forbids parallax-style motion.
 */
export default function TiltCard({ href, children, className = "" }: TiltCardProps) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 ease-cinema hover:-translate-y-1 hover:border-cyan/40 hover:shadow-cardHover motion-reduce:transform-none ${className}`}
    >
      {children}
    </Link>
  );
}
