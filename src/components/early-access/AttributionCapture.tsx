"use client";

import { useEffect } from "react";
import { captureFirstTouch } from "@/lib/attribution";

/** Records the first landing URL in sessionStorage. Renders nothing and sets no cookies. */
export default function AttributionCapture() {
  useEffect(() => {
    captureFirstTouch(window.sessionStorage, window.location, document.referrer);
  }, []);
  return null;
}
