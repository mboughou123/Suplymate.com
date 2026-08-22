"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Segment-level error boundary for every localised route.
 *
 * Without this, a thrown error in any of the 53 pages fell through to the
 * built-in Next.js error screen, which is unstyled and offers no way back.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Surfaces in the server logs / browser console for diagnosis; the digest
    // is the only identifier shared with the user-visible message.
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-heading-lg text-ink">
        {t("unexpectedTitle")}
      </h1>
      <p className="mt-3 max-w-md text-body text-ink-muted">
        {t("unexpectedDescription")}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary px-6 py-3">
          <RotateCcw className="h-4 w-4" aria-hidden />
          {t("tryAgain")}
        </button>
        <Link href="/" className="btn-secondary px-6 py-3">
          {t("backHome")}
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-caption text-ink-dim">
          {t("errorReference", { digest: error.digest })}
        </p>
      )}
    </div>
  );
}
