export type FxEnvironment = {
  webgl: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  coarsePointer: boolean;
  narrowViewport: boolean;
  lowCpu: boolean;
};

/**
 * WebGL chrome (metal-fx, thinking-orbs, border-beam) is decoration.
 * Keep it off phones, Save-Data, reduced-motion, and low-end CPUs so the
 * hero does not steal the main thread on the devices Amine called sluggish.
 */
export function shouldEnableVisualFx(env: FxEnvironment): boolean {
  if (!env.webgl) return false;
  if (env.prefersReducedMotion) return false;
  if (env.saveData) return false;
  if (env.coarsePointer) return false;
  if (env.narrowViewport) return false;
  if (env.lowCpu) return false;
  return true;
}

export function readFxEnvironment(): FxEnvironment {
  if (typeof window === "undefined") {
    return {
      webgl: false,
      prefersReducedMotion: true,
      saveData: false,
      coarsePointer: true,
      narrowViewport: true,
      lowCpu: false,
    };
  }

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };

  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    webgl = false;
  }

  const cores = nav.hardwareConcurrency ?? 8;
  return {
    webgl,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: Boolean(nav.connection?.saveData),
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    narrowViewport: window.matchMedia("(max-width: 767px)").matches,
    lowCpu: cores > 0 && cores <= 4,
  };
}
