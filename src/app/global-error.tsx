"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors thrown by the root layout itself.
 *
 * It replaces the whole document, so it must render its own <html>/<body> and
 * cannot use next-intl: the failure may be in the provider that supplies
 * translations. Copy is therefore hardcoded English, which matches the
 * English-only public site.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white p-6">
        <main className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            This page didn&apos;t load
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Something went wrong on our side. Trying again usually works.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Try again
            </button>
            {/*
              A plain anchor is intentional: the root layout failed, so the
              client router may be unusable. A full document load is the only
              reliable way out, which is exactly what next/link avoids.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Back to home
            </a>
          </div>

          {error.digest && (
            <p className="mt-6 text-xs text-slate-400">
              Reference {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
