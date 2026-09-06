// xAI (Grok) integration — thin, dependency-free client over the OpenAI-
// compatible REST API at https://api.x.ai/v1.
//
// Local: add XAI_API_KEY=xai-... to .env.local (never commit this file).
// Production: Vercel → Project Settings → Environment Variables → XAI_API_KEY.
// Without a key every helper reports `configured: false` and callers skip the
// Grok step — the import pipeline never depends on Grok being available.
//
// The key is read on the server ONLY (no NEXT_PUBLIC_ prefix) and never logged.
//
// Model names (see https://docs.x.ai/developers/models): `grok-4.6` accepts
// text + image input, so it doubles as the vision model. Override with
// XAI_MODEL (text) / XAI_VISION_MODEL (images) when xAI ships newer ids.

export const XAI_BASE_URL = "https://api.x.ai/v1";
export const DEFAULT_XAI_MODEL = "grok-4.6";
export const DEFAULT_XAI_VISION_MODEL = "grok-4.6";
/** Per-request timeout; must stay well under the cron route's maxDuration. */
export const XAI_TIMEOUT_MS = 45_000;

export function isXaiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export function xaiBaseUrl(): string {
  return (process.env.XAI_BASE_URL?.trim() || XAI_BASE_URL).replace(/\/+$/, "");
}

export function xaiModel(): string {
  return process.env.XAI_MODEL?.trim() || DEFAULT_XAI_MODEL;
}

export function xaiVisionModel(): string {
  return process.env.XAI_VISION_MODEL?.trim() || process.env.XAI_MODEL?.trim() || DEFAULT_XAI_VISION_MODEL;
}

/* ------------------------------------------------------------------ */
/* Message shapes (OpenAI-compatible chat completions)                 */
/* ------------------------------------------------------------------ */

export type XaiTextPart = { type: "text"; text: string };
export type XaiImagePart = {
  type: "image_url";
  image_url: { url: string; detail?: "low" | "high" | "auto" };
};
export type XaiContentPart = XaiTextPart | XaiImagePart;

export type XaiMessage = {
  role: "system" | "user" | "assistant";
  content: string | XaiContentPart[];
};

export type XaiChatOptions = {
  messages: XaiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask for a JSON object response (OpenAI-compatible `response_format`). */
  json?: boolean;
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

export type XaiChatResult =
  | { ok: true; content: string; model: string; usage?: { prompt_tokens?: number; completion_tokens?: number } }
  | { ok: false; error: string; status?: number };

/** Strip anything that looks like an API key before it reaches a log line. */
export function redactXaiSecrets(text: string): string {
  return text.replace(/xai-[A-Za-z0-9_-]{4,}/g, "xai-***").replace(/Bearer\s+[A-Za-z0-9._-]{8,}/g, "Bearer ***");
}

/**
 * One chat completion against xAI. Never throws: network / HTTP / parse
 * failures are returned as `{ ok: false, error }` with a secret-free message.
 */
export async function xaiChat(opts: XaiChatOptions): Promise<XaiChatResult> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "XAI_API_KEY not configured" };

  const model = opts.model ?? xaiModel();
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.json) body.response_format = { type: "json_object" };

  const fetchImpl = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(`${xaiBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: opts.signal ?? AbortSignal.timeout(XAI_TIMEOUT_MS),
    });
  } catch (err) {
    const name = (err as Error)?.name ?? "Error";
    return { ok: false, error: `xAI request failed (${name === "TimeoutError" ? `timeout after ${Math.round(XAI_TIMEOUT_MS / 1000)}s` : "network error"})` };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = "";
    try {
      const j = JSON.parse(text) as { error?: { message?: string; code?: string } | string };
      detail = typeof j.error === "string" ? j.error : j.error?.message ?? j.error?.code ?? "";
    } catch {
      detail = text.slice(0, 160);
    }
    const hint =
      res.status === 401
        ? "invalid or missing API key"
        : res.status === 404
          ? `model "${model}" not found`
          : res.status === 429
            ? "rate limited / quota"
            : "";
    return {
      ok: false,
      status: res.status,
      error: redactXaiSecrets(`xAI request failed (${res.status}${hint ? ` ${hint}` : ""}${detail ? `: ${detail}` : ""})`),
    };
  }

  let json: {
    model?: string;
    choices?: { message?: { content?: string | XaiContentPart[] } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    return { ok: false, error: "xAI returned a non-JSON response" };
  }
  const raw = json.choices?.[0]?.message?.content;
  const content =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((p) => (p.type === "text" ? p.text : "")).join("")
        : "";
  if (!content.trim()) return { ok: false, error: "xAI returned an empty completion" };
  return { ok: true, content, model: json.model ?? model, usage: json.usage };
}

/**
 * Parse a JSON object out of a model reply, tolerating ```json fences and
 * leading prose. Returns null when nothing parseable is found.
 */
export function parseJsonObject<T = Record<string, unknown>>(text: string): T | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], trimmed];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c) as T;
    } catch {
      const start = c.indexOf("{");
      const end = c.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(c.slice(start, end + 1)) as T;
        } catch {
          // try next candidate
        }
      }
    }
  }
  return null;
}

/** Convenience: JSON-mode chat that returns the parsed object (or null + error). */
export async function xaiJson<T = Record<string, unknown>>(
  opts: Omit<XaiChatOptions, "json">
): Promise<{ ok: true; data: T; model: string } | { ok: false; error: string }> {
  const res = await xaiChat({ ...opts, json: true });
  if (!res.ok) return res;
  const data = parseJsonObject<T>(res.content);
  if (!data) return { ok: false, error: "xAI reply was not valid JSON" };
  return { ok: true, data, model: res.model };
}
