"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import FxBoundary from "@/components/fx/FxBoundary";

const ThinkingOrb = dynamic(
  () => import("thinking-orbs").then((m) => m.ThinkingOrb),
  {
    ssr: false,
    loading: () => <span aria-hidden className="inline-block h-16 w-16" />,
  },
);

export type OrbState =
  | "searching"
  | "working"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping";

type Props = Omit<ComponentProps<typeof ThinkingOrb>, "state"> & {
  state?: OrbState;
};

/** Suplymate's AI intelligence indicator — replaces generic spinners. */
export default function AiOrb({ state = "breathing", size = 64, theme = "dark", ...rest }: Props) {
  const fallback = (
    <span
      aria-hidden
      className="inline-block rounded-full border border-cyan-glow/40 bg-cyan/20"
      style={{ width: size, height: size }}
    />
  );
  return (
    <FxBoundary fallback={fallback}>
      <ThinkingOrb state={state} size={size} theme={theme} {...rest} />
    </FxBoundary>
  );
}
