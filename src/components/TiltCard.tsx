"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";

type TiltCardProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

/**
 * Interactive card wrapper: 3D pointer tilt + cursor-following spotlight.
 * Children (including icons) are rendered by the parent server component,
 * so no component functions cross the server/client boundary.
 */
export default function TiltCard({ href, children, className = "" }: TiltCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-4px)`;
    el.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(py + 0.5) * 100}%`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card backdrop-blur-xl transition-[transform,border-color,box-shadow] duration-300 ease-cinema hover:border-cyan/40 hover:shadow-cardHover ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(18rem 18rem at var(--mx,50%) var(--my,50%), rgba(14,165,233,0.12), transparent 60%)",
        }}
      />
      {children}
    </Link>
  );
}
