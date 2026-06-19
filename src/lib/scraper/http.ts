// Polite HTTP fetch helpers for the scraper: descriptive User-Agent, per-request
// timeout, content-type guard, and resilient error handling (never throws — the
// orchestrator continues on any single failure).

import { SCRAPER_USER_AGENT } from "./types";

const DEFAULT_TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS ?? 15_000);

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type FetchResult = {
  html: string | null;
  status: number | null;
  error: string | null;
  /** Final URL after redirects (for resolving relative links). */
  finalUrl: string;
};

export async function fetchHtml(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": SCRAPER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const finalUrl = res.url || url;
    if (!res.ok) {
      return { html: null, status: res.status, error: `HTTP ${res.status}`, finalUrl };
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) {
      return { html: null, status: res.status, error: `non-HTML (${ct})`, finalUrl };
    }
    const html = await res.text();
    return { html, status: res.status, error: null, finalUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    return { html: null, status: null, error: message, finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve a possibly-relative href against a base URL; null on failure. */
export function absoluteUrl(base: string, href: string | undefined | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:")) return null;
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return null;
  }
}
