// Free, local image QA for the media bots: an Ollama vision model (OpenAI-
// compatible API, no key, nothing leaves the machine) checks each prepared
// image before it is pushed. It can only REJECT: a bad verdict keeps an image
// out of the push; a good verdict still lands unpublished for admin review.
// Results are cached by image hash + model + prompt version (see ai-cache.ts).

import { createHash } from "node:crypto";
import { chatCompletion, parseJsonObject, type XaiChatOptions } from "@/lib/xai";
import type { MediaQa, MediaRole } from "../manifest";
import type { AiCache } from "./ai-cache";

export const DEFAULT_LOCAL_AI_BASE_URL = "http://localhost:11434/v1";
export const DEFAULT_LOCAL_AI_VISION_MODEL = "qwen2.5vl:3b";
export const QA_PROMPT_VERSION = "media-qa-v1";
/** CPU inference on a bot machine is slow; the cache makes it a one-time cost. */
export const LOCAL_AI_TIMEOUT_MS = 180_000;

export type LocalAiConfig = { baseUrl: string; model: string };

export function localAiConfig(env: Record<string, string | undefined>): LocalAiConfig {
  return {
    baseUrl: (env.LOCAL_AI_BASE_URL?.trim() || DEFAULT_LOCAL_AI_BASE_URL).replace(/\/+$/, ""),
    model: env.LOCAL_AI_VISION_MODEL?.trim() || DEFAULT_LOCAL_AI_VISION_MODEL,
  };
}

function roleDescription(role: MediaRole): string {
  switch (role) {
    case "logo":
      return "the company's logo (a logo mark or wordmark, not a photo)";
    case "cover":
      return "a wide banner photo of the company's site, plant or operations";
    case "factory":
      return "a photo of the company's factory, plant, warehouse or production line";
    case "gallery":
      return "a photo of the company's facilities, equipment, team at work or products";
    case "product":
      return "a photo of the product itself";
    case "certificate":
      return "a scan or photo of a certificate document (e.g. ISO, CE, mill test certificate)";
    default: {
      const unreachable: never = role;
      return String(unreachable);
    }
  }
}

export function qaCacheKey(sha256: string, model: string): string {
  return createHash("sha256").update(`${QA_PROMPT_VERSION}\n${model}\n${sha256}`).digest("hex");
}

export function parseQaVerdict(raw: unknown, model: string): MediaQa | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const quality = typeof o.quality === "number" ? o.quality : typeof o.quality === "string" ? Number(o.quality) : NaN;
  if (typeof o.matchesRole !== "boolean" || typeof o.marketplaceWatermark !== "boolean" || !Number.isFinite(quality)) return null;
  const qa: MediaQa = {
    model,
    quality: Math.max(1, Math.min(5, Math.round(quality))),
    matchesRole: o.matchesRole,
    marketplaceWatermark: o.marketplaceWatermark,
  };
  if (typeof o.notes === "string" && o.notes.trim()) qa.notes = o.notes.trim().slice(0, 300);
  return qa;
}

export type ReviewResult = { ok: true; qa: MediaQa; cached: boolean } | { ok: false; error: string };

export async function reviewImage(input: {
  buffer: Buffer;
  mimeType: string;
  sha256: string;
  role: MediaRole;
  entityName: string;
  config: LocalAiConfig;
  cache: AiCache;
  fetchImpl?: XaiChatOptions["fetchImpl"];
}): Promise<ReviewResult> {
  const { config, cache } = input;
  if (input.mimeType === "image/svg+xml") return { ok: false, error: "vector logos are not reviewed by the vision model" };
  const key = qaCacheKey(input.sha256, config.model);
  const hit = parseQaVerdict(await cache.getResult(key), config.model);
  if (hit) return { ok: true, qa: hit, cached: true };

  const res = await chatCompletion(
    { baseUrl: config.baseUrl, label: "Local AI", timeoutMs: LOCAL_AI_TIMEOUT_MS },
    {
      model: config.model,
      json: true,
      temperature: 0,
      maxTokens: 300,
      fetchImpl: input.fetchImpl,
      messages: [
        {
          role: "system",
          content:
            "You review images for a B2B industrial sourcing website. Judge only what is visible in the image. " +
            "Never guess or invent company names, certificate numbers or facts. Reply with one JSON object only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Expected: ${roleDescription(input.role)} for "${input.entityName}".\n` +
                'Return {"matchesRole": boolean, "quality": 1-5, "marketplaceWatermark": boolean, "notes": string}.\n' +
                "matchesRole: does the image show what is expected?\n" +
                "quality: 1 unusable, 3 acceptable, 5 excellent (sharpness, exposure, framing).\n" +
                "marketplaceWatermark: true if the image carries a watermark, badge or overlay from a marketplace or " +
                "directory (Alibaba, AliExpress, 1688, Made-in-China, Global Sources, IndiaMART, Amazon, eBay) or a stock-photo watermark.\n" +
                "notes: at most one short sentence.",
            },
            { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.buffer.toString("base64")}` } },
          ],
        },
      ],
    }
  );
  if (!res.ok) return { ok: false, error: res.error };
  const qa = parseQaVerdict(parseJsonObject(res.content), config.model);
  if (!qa) return { ok: false, error: "local AI reply was not a valid verdict" };
  await cache.setResult(key, { task: QA_PROMPT_VERSION, model: config.model, inputSha256: input.sha256, result: qa });
  return { ok: true, qa, cached: false };
}

/** Is the local AI server up and is the model pulled? */
export async function localAiStatus(config: LocalAiConfig, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetchImpl(`${config.baseUrl}/models`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return { ok: false, detail: `${config.baseUrl}/models answered ${res.status}` };
    const body = (await res.json()) as { data?: { id?: string }[] };
    const ids = (body.data ?? []).map((m) => m.id ?? "");
    const pulled = ids.some((id) => id === config.model || id.startsWith(`${config.model}:`));
    return pulled ? { ok: true, detail: `model ${config.model} ready` } : { ok: false, detail: `model ${config.model} is not pulled (have: ${ids.join(", ") || "none"})` };
  } catch (err) {
    return { ok: false, detail: `${config.baseUrl} unreachable (${(err as Error).name})` };
  }
}
