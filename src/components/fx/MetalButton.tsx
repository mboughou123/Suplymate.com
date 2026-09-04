"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentProps, type ReactElement } from "react";
import FxBoundary, { supportsWebGL } from "@/components/fx/FxBoundary";

const MetalFx = dynamic(() => import("metal-fx").then((m) => m.MetalFx), {
  ssr: false,
  loading: () => null,
});

type Props = Omit<ComponentProps<typeof MetalFx>, "children"> & {
  children: ReactElement;
};

/**
 * Liquid-metal ring for the handful of primary CTAs (Start sourcing, Ask AI,
 * Upgrade, Request quote). Wraps exactly one interactive child. Renders the
 * plain child when WebGL is unavailable or the effect fails.
 */
export default function MetalButton({
  children,
  preset = "chromatic",
  strength = 0.9,
  theme = "dark",
  variant = "button",
  ...rest
}: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(!reduced && supportsWebGL());
  }, []);

  if (!enabled) return children;

  return (
    <FxBoundary fallback={children}>
      <MetalFx preset={preset} strength={strength} theme={theme} variant={variant} {...rest}>
        {children}
      </MetalFx>
    </FxBoundary>
  );
}
