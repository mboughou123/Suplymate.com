"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

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
  return <ThinkingOrb state={state} size={size} theme={theme} {...rest} />;
}
