"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import FxBoundary from "@/components/fx/FxBoundary";

const BorderBeam = dynamic(
  () => import("border-beam").then((m) => m.BorderBeam),
  { ssr: false, loading: () => null },
);

type BeamProps = ComponentProps<typeof BorderBeam>;

/**
 * Animated border beam for the few cards that deserve emphasis (AI container,
 * top supplier match, premium plan). Renders children immediately; the beam
 * overlay attaches after hydration and is dropped silently if it fails.
 */
export default function Beam({
  children,
  size = "md",
  colorVariant = "ocean",
  strength = 0.6,
  theme = "dark",
  className,
  ...rest
}: BeamProps & { className?: string }) {
  return (
    <div className={className}>
      <FxBoundary fallback={children}>
        <BorderBeam size={size} colorVariant={colorVariant} strength={strength} theme={theme} {...rest}>
          {children}
        </BorderBeam>
      </FxBoundary>
    </div>
  );
}
