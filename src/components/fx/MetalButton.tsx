"use client";

import dynamic from "next/dynamic";
import type { ComponentProps, ReactElement } from "react";

const MetalFx = dynamic(() => import("metal-fx").then((m) => m.MetalFx), {
  ssr: false,
  loading: () => null,
});

type Props = Omit<ComponentProps<typeof MetalFx>, "children"> & {
  children: ReactElement;
};

/**
 * Liquid-metal ring for the handful of primary CTAs (Start sourcing, Ask AI,
 * Upgrade, Request quote). Wraps exactly one interactive child.
 */
export default function MetalButton({
  children,
  preset = "chromatic",
  strength = 0.9,
  theme = "dark",
  variant = "button",
  ...rest
}: Props) {
  return (
    <MetalFx preset={preset} strength={strength} theme={theme} variant={variant} {...rest}>
      {children}
    </MetalFx>
  );
}
