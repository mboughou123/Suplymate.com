"use client";

import { useEffect, useState } from "react";
import { readFxEnvironment, shouldEnableVisualFx } from "@/lib/fx-enabled";

/** Starts false so SSR/phones never pay for WebGL chrome. */
export function useFxEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(shouldEnableVisualFx(readFxEnvironment()));
  }, []);
  return enabled;
}
