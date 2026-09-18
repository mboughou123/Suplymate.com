"use client";

import { Component, useEffect, useState, type ReactNode } from "react";

type Props = { children: ReactNode; fallback: ReactNode };
type State = { failed: boolean };

/**
 * Visual effects are decoration. If an effect library throws (no WebGL, old
 * browser, headless client) we render the plain child instead of crashing the
 * page.
 */
export default class FxBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(): void {
    /* intentionally silent — the effect is optional */
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

let webglSupport: boolean | null = null;

/** Cached WebGL capability check (client only). */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    webglSupport = Boolean(gl);
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/**
 * Decorative FX (metal-fx, border-beam, thinking-orbs) stay off until we know
 * the device can take them. Mobile first-load was paying for WebGL shaders
 * before the catalogue images had even decoded.
 */
export function useFxEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const saveData =
      "connection" in navigator &&
      Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    setEnabled(!reduced && !mobile && !saveData && supportsWebGL());
  }, []);

  return enabled;
}
