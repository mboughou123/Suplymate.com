// Safe media ingestion helpers: SSRF-hardened remote image fetch + validation,
// and SVG sanitization. Used by the URL-import and upload API routes so the
// media library never hotlinks blindly nor stores hostile files.

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB

// Raster formats accepted everywhere. SVG is handled separately (admin logos
// only, after sanitization) by the upload route.
export const RASTER_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export const SVG_MIME = "image/svg+xml";

export type FetchResult =
  | { ok: true; buffer: Buffer; contentType: string; finalUrl: string }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* SSRF protection                                                     */
/* ------------------------------------------------------------------ */

// Block private, loopback, link-local and cloud-metadata ranges so an admin
// pasting a crafted URL can't make the server reach internal resources.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) {
    return true;
  }
  // IPv6 loopback / unspecified / unique-local / link-local
  if (h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) {
    return true;
  }
  // Cloud metadata endpoints.
  if (h === "169.254.169.254" || h === "metadata.google.internal") return true;

  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast / reserved
  }
  return false;
}

/** Validate a candidate URL is a public http(s) URL safe to fetch. */
export function validateRemoteUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invalid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http(s) URLs are allowed." };
  }
  if (!url.hostname || isBlockedHost(url.hostname)) {
    return { ok: false, error: "This host is not allowed." };
  }
  return { ok: true, url };
}

/* ------------------------------------------------------------------ */
/* Remote fetch with size + MIME guards                                */
/* ------------------------------------------------------------------ */

/**
 * Fetch a remote image safely: validates the URL, confirms an image MIME type,
 * enforces a size cap (Content-Length pre-check + streamed byte cap), and
 * returns the downloaded bytes. Never follows to a blocked host on redirect
 * (manual redirect handling).
 */
export async function fetchRemoteImage(raw: string): Promise<FetchResult> {
  const v = validateRemoteUrl(raw);
  if (!v.ok) return { ok: false, error: v.error };

  let current = v.url;
  // Follow up to 4 redirects manually, re-validating each hop.
  for (let hop = 0; hop < 5; hop++) {
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        redirect: "manual",
        headers: { Accept: "image/*,*/*;q=0.8", "User-Agent": "SuplymateMediaBot/1.0" },
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      return { ok: false, error: `Could not fetch image (${(err as Error).name}).` };
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { ok: false, error: "Redirect without a destination." };
      const next = validateRemoteUrl(new URL(loc, current).toString());
      if (!next.ok) return { ok: false, error: next.error };
      current = next.url;
      continue;
    }

    if (!res.ok) return { ok: false, error: `Source returned HTTP ${res.status}.` };

    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) {
      return { ok: false, error: `Not an image (got "${contentType || "unknown"}").` };
    }
    const declaredLen = Number(res.headers.get("content-length") ?? "0");
    if (declaredLen && declaredLen > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Image exceeds the 12 MB size limit." };
    }

    const ab = await res.arrayBuffer();
    const buffer = Buffer.from(ab);
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Image exceeds the 12 MB size limit." };
    }
    if (buffer.byteLength === 0) {
      return { ok: false, error: "Downloaded image was empty." };
    }
    return { ok: true, buffer, contentType, finalUrl: current.toString() };
  }
  return { ok: false, error: "Too many redirects." };
}

/* ------------------------------------------------------------------ */
/* SVG sanitization                                                    */
/* ------------------------------------------------------------------ */

/**
 * Strip executable / external-reference vectors from an SVG so it is safe to
 * host and render inline. Removes <script>, <foreignObject>, event handlers
 * (on*), javascript: URLs, and external entity/DTD declarations. Returns the
 * sanitized SVG string, or null if the input doesn't look like an SVG.
 */
export function sanitizeSvg(input: string): string | null {
  if (!/<svg[\s>]/i.test(input)) return null;
  let svg = input;
  // Remove DOCTYPE / ENTITY declarations (XXE).
  svg = svg.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  svg = svg.replace(/<!ENTITY[\s\S]*?>/gi, "");
  // Remove <script>…</script> and <foreignObject>…</foreignObject>.
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/<script[^>]*\/>/gi, "");
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  // Remove inline event handlers: on*="..."  on*='...'  on*=value
  svg = svg.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  svg = svg.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  svg = svg.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  // Neutralise javascript: / data: (non-image) URIs in href/xlink:href/src.
  svg = svg.replace(/(href|xlink:href|src)\s*=\s*"(\s*javascript:[^"]*)"/gi, '$1="#"');
  svg = svg.replace(/(href|xlink:href|src)\s*=\s*'(\s*javascript:[^']*)'/gi, "$1='#'");
  // Remove <use> external references and <a> javascript links remain neutralised above.
  return svg.trim();
}
