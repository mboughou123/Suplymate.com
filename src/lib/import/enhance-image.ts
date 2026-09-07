// Pluggable "enhanced photos" step for the daily import.
//
// Grok (a language/vision model) cannot edit pixels, so enhancement is delegated
// to one of three providers, chosen by env at runtime:
//
//   1. Webhook  — IMAGE_ENHANCER_URL (+ optional IMAGE_ENHANCER_KEY). This is the
//      hook for Amine's "Image Enhancer" Grok Bot or any other service.
//      Contract:
//        POST {IMAGE_ENHANCER_URL}
//        Headers: Content-Type: application/json
//                 Authorization: Bearer {IMAGE_ENHANCER_KEY}   (when set)
//        Body:    { "imageUrl": "https://…", "kind": "photo" | "certificate",
//                   "entity": { "type": "SUPPLIER", "id": "posco" } | null,
//                   "requestId": "…" }
//        200 OK:  { "url": "https://…/enhanced.jpg" }            → we download it
//                 or { "image": "data:image/jpeg;base64,…" }     → inline result
//                 or { "skipped": true, "reason": "…" }          → keep original
//        Any non-2xx / timeout / invalid body ⇒ keep the original (never fails the run).
//
//   2. OpenAI image edits (gpt-image-1) — only when OPENAI_API_KEY is set AND
//      IMAGE_ENHANCE_WITH_OPENAI=true. Off by default: it costs money and a
//      generative model must never fabricate details on a factory/cert photo, so
//      the prompt is strictly "clean up, keep every real detail".
//
//   3. None — store the original unchanged (default).
//
// The enhanced bytes are stored in Blob next to the original by media-ingest.ts.

import { fetchRemoteImage, validateRemoteUrl, RASTER_MIME, MAX_IMAGE_BYTES } from "@/lib/media-fetch";

export type EnhancerProvider = "webhook" | "openai" | "none";
export type EnhanceKind = "photo" | "certificate" | "logo";

export type EnhanceInput = {
  imageUrl: string;
  /** Already-downloaded bytes (avoids a second fetch for the OpenAI provider). */
  buffer?: Buffer;
  contentType?: string | null;
  kind?: EnhanceKind;
  entity?: { type: string; id: string } | null;
  requestId?: string;
};

export type EnhanceResult =
  | { enhanced: true; provider: Exclude<EnhancerProvider, "none">; buffer: Buffer; contentType: string; resultUrl?: string }
  | { enhanced: false; provider: EnhancerProvider; reason: string };

export type EnhancerStatus = { provider: EnhancerProvider; configured: boolean; note: string };

export const OPENAI_IMAGE_EDIT_MODEL = "gpt-image-1";
export const ENHANCE_PROMPT =
  "Restore and clean up this photograph for a B2B supplier directory: correct exposure and white balance, " +
  "reduce noise and compression artifacts, gently sharpen. Keep every real detail exactly as it is. " +
  "Do NOT add, remove, move or invent any objects, text, logos, people, machinery or products. " +
  "Do not change the composition, crop, colours of materials, or any text on documents.";

function enhancerTimeoutMs(): number {
  const n = Number(process.env.IMAGE_ENHANCER_TIMEOUT_MS ?? "60000");
  return Number.isFinite(n) && n > 1000 ? n : 60_000;
}

export function enhancerStatus(env: NodeJS.ProcessEnv = process.env): EnhancerStatus {
  const webhook = env.IMAGE_ENHANCER_URL?.trim();
  if (webhook) {
    const v = validateRemoteUrl(webhook);
    return v.ok
      ? { provider: "webhook", configured: true, note: `Webhook enhancer at ${v.url.hostname}` }
      : { provider: "none", configured: false, note: `IMAGE_ENHANCER_URL invalid (${v.error}) — enhancement disabled.` };
  }
  const openaiOn = /^(1|true|yes)$/i.test(env.IMAGE_ENHANCE_WITH_OPENAI?.trim() ?? "");
  if (openaiOn && env.OPENAI_API_KEY?.trim()) {
    return { provider: "openai", configured: true, note: `OpenAI ${OPENAI_IMAGE_EDIT_MODEL} image edits (paid; conservative prompt).` };
  }
  if (openaiOn) {
    return { provider: "none", configured: false, note: "IMAGE_ENHANCE_WITH_OPENAI=true but OPENAI_API_KEY missing — storing originals." };
  }
  return { provider: "none", configured: false, note: "No image enhancer configured (IMAGE_ENHANCER_URL / IMAGE_ENHANCE_WITH_OPENAI) — storing originals." };
}

function extFor(contentType: string): string {
  const ct = contentType.split(";")[0].trim().toLowerCase();
  if (ct === "image/png") return "png";
  if (ct === "image/webp") return "webp";
  return "jpg";
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const m = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) return null;
  try {
    const buffer = Buffer.from(m[2].replace(/\s+/g, ""), "base64");
    if (!buffer.byteLength || buffer.byteLength > MAX_IMAGE_BYTES) return null;
    return { buffer, contentType: m[1].toLowerCase() };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Provider: webhook                                                   */
/* ------------------------------------------------------------------ */

async function enhanceViaWebhook(input: EnhanceInput, fetchImpl: typeof fetch): Promise<EnhanceResult> {
  const endpoint = process.env.IMAGE_ENHANCER_URL!.trim();
  const key = process.env.IMAGE_ENHANCER_KEY?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  let res: Response;
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        imageUrl: input.imageUrl,
        kind: input.kind ?? "photo",
        entity: input.entity ?? null,
        requestId: input.requestId ?? `enh_${Date.now().toString(36)}`,
      }),
      signal: AbortSignal.timeout(enhancerTimeoutMs()),
    });
  } catch (err) {
    const name = (err as Error)?.name ?? "Error";
    return { enhanced: false, provider: "webhook", reason: name === "TimeoutError" ? "enhancer timeout" : "enhancer unreachable" };
  }
  if (!res.ok) return { enhanced: false, provider: "webhook", reason: `enhancer HTTP ${res.status}` };

  let body: { url?: string; enhancedUrl?: string; image?: string; skipped?: boolean; reason?: string };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    return { enhanced: false, provider: "webhook", reason: "enhancer returned non-JSON" };
  }
  if (body.skipped) return { enhanced: false, provider: "webhook", reason: body.reason ?? "enhancer skipped" };

  if (typeof body.image === "string" && body.image.startsWith("data:")) {
    const decoded = decodeDataUrl(body.image);
    if (!decoded) return { enhanced: false, provider: "webhook", reason: "enhancer inline image invalid" };
    return { enhanced: true, provider: "webhook", ...decoded };
  }

  const resultUrl = (body.url ?? body.enhancedUrl ?? "").trim();
  if (!resultUrl) return { enhanced: false, provider: "webhook", reason: "enhancer returned no url" };
  if (resultUrl === input.imageUrl) return { enhanced: false, provider: "webhook", reason: "enhancer returned the original url" };

  const fetched = await fetchRemoteImage(resultUrl);
  if (!fetched.ok) return { enhanced: false, provider: "webhook", reason: `enhanced download failed: ${fetched.error}` };
  return { enhanced: true, provider: "webhook", buffer: fetched.buffer, contentType: fetched.contentType, resultUrl };
}

/* ------------------------------------------------------------------ */
/* Provider: OpenAI image edits                                        */
/* ------------------------------------------------------------------ */

async function enhanceViaOpenAi(input: EnhanceInput, fetchImpl: typeof fetch): Promise<EnhanceResult> {
  const apiKey = process.env.OPENAI_API_KEY!.trim();
  let buffer = input.buffer;
  let contentType = (input.contentType ?? "").split(";")[0].trim().toLowerCase();
  if (!buffer) {
    const fetched = await fetchRemoteImage(input.imageUrl);
    if (!fetched.ok) return { enhanced: false, provider: "openai", reason: `source download failed: ${fetched.error}` };
    buffer = fetched.buffer;
    contentType = fetched.contentType;
  }
  if (!RASTER_MIME.has(contentType) || contentType === "image/gif" || contentType === "image/avif") {
    return { enhanced: false, provider: "openai", reason: `unsupported input type ${contentType || "unknown"}` };
  }

  const form = new FormData();
  form.append("model", OPENAI_IMAGE_EDIT_MODEL);
  form.append("prompt", ENHANCE_PROMPT);
  form.append("n", "1");
  form.append("size", "auto");
  form.append("quality", process.env.IMAGE_ENHANCE_OPENAI_QUALITY?.trim() || "medium");
  form.append("image", new Blob([new Uint8Array(buffer)], { type: contentType }), `source.${extFor(contentType)}`);

  let res: Response;
  try {
    res = await fetchImpl("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(Math.max(enhancerTimeoutMs(), 90_000)),
    });
  } catch (err) {
    const name = (err as Error)?.name ?? "Error";
    return { enhanced: false, provider: "openai", reason: name === "TimeoutError" ? "openai timeout" : "openai unreachable" };
  }
  if (!res.ok) return { enhanced: false, provider: "openai", reason: `openai HTTP ${res.status}` };

  let json: { data?: { b64_json?: string; url?: string }[] };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    return { enhanced: false, provider: "openai", reason: "openai returned non-JSON" };
  }
  const first = json.data?.[0];
  if (first?.b64_json) {
    const out = Buffer.from(first.b64_json, "base64");
    if (!out.byteLength || out.byteLength > MAX_IMAGE_BYTES) return { enhanced: false, provider: "openai", reason: "openai result invalid size" };
    return { enhanced: true, provider: "openai", buffer: out, contentType: "image/png" };
  }
  if (first?.url) {
    const fetched = await fetchRemoteImage(first.url);
    if (!fetched.ok) return { enhanced: false, provider: "openai", reason: `openai result download failed: ${fetched.error}` };
    return { enhanced: true, provider: "openai", buffer: fetched.buffer, contentType: fetched.contentType, resultUrl: first.url };
  }
  return { enhanced: false, provider: "openai", reason: "openai returned no image" };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/**
 * Enhance one image with the configured provider. NEVER throws and never
 * fabricates: on any failure the caller keeps the original bytes.
 */
export async function enhanceImage(
  input: EnhanceInput,
  opts: { fetchImpl?: typeof fetch } = {}
): Promise<EnhanceResult> {
  if (input.kind === "logo") return { enhanced: false, provider: "none", reason: "logos are never enhanced" };
  const status = enhancerStatus();
  if (!status.configured) return { enhanced: false, provider: "none", reason: status.note };
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    if (status.provider === "webhook") return await enhanceViaWebhook(input, fetchImpl);
    if (status.provider === "openai") return await enhanceViaOpenAi(input, fetchImpl);
  } catch (err) {
    return { enhanced: false, provider: status.provider, reason: `enhancer error: ${(err as Error).message}` };
  }
  return { enhanced: false, provider: "none", reason: "no provider" };
}
