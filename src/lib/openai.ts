// OpenAI integration for Suplymate AI features.
//
// Local: add OPENAI_API_KEY=sk-... to .env.local (never commit this file).
// Production: Vercel → Project Settings → Environment Variables → OPENAI_API_KEY.
// Without a key, AI features use built-in demo fallbacks.
//
// The API key is read on the server ONLY. It is never exposed to the browser
// (no NEXT_PUBLIC_ prefix) and is never logged.

import OpenAI from "openai";

/** Default chat model. Override with OPENAI_MODEL. */
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

/** Per-request timeout. Must stay below the route's `maxDuration` (60s). */
export const OPENAI_TIMEOUT_MS = 40_000;
export const OPENAI_MAX_RETRIES = 1;

/** Chat model. Override with OPENAI_MODEL; falls back to a sane default. */
export function openAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

let client: OpenAI | null = null;
let clientKey: string | null = null;

/** Lazily construct a singleton OpenAI client. Throws if no key is configured. */
export function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  // Rebuild if the key changed (env reload in dev / tests).
  if (!client || clientKey !== apiKey) {
    client = new OpenAI({ apiKey, timeout: OPENAI_TIMEOUT_MS, maxRetries: OPENAI_MAX_RETRIES });
    clientKey = apiKey;
  }
  return client;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionOptions = {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
};

/** Strip anything that looks like an API key before it reaches a log line. */
function redactSecrets(text: string): string {
  return text.replace(/sk-[A-Za-z0-9_-]{4,}/g, "sk-***");
}

/**
 * Human-readable, secret-free summary of an OpenAI failure, e.g.
 * "OpenAI request failed (401 invalid_api_key)" or
 * "OpenAI request failed (timeout after 40s)". Safe to return to the client.
 */
export function describeOpenAiError(err: unknown): string {
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return `OpenAI request failed (timeout after ${Math.round(OPENAI_TIMEOUT_MS / 1000)}s)`;
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return "OpenAI request failed (network error)";
  }
  if (err instanceof OpenAI.APIError) {
    const parts = [err.status, err.code ?? err.type].filter(Boolean).join(" ");
    const hint =
      err.status === 401
        ? "invalid or missing API key"
        : err.status === 404
          ? `model "${openAiModel()}" not found or not accessible`
          : err.status === 429
            ? /quota|billing/i.test(err.message)
              ? "quota exceeded — check billing"
              : "rate limited"
            : err.status && err.status >= 500
              ? "OpenAI server error"
              : null;
    return `OpenAI request failed (${parts || "unknown"}${hint ? `: ${hint}` : ""})`;
  }
  if (err instanceof Error) {
    if (err.message === "OPENAI_API_KEY not configured") return "OpenAI key missing";
    return `OpenAI request failed (${redactSecrets(err.message).slice(0, 120)})`;
  }
  return "OpenAI request failed (unknown error)";
}

/**
 * Server-side log for an OpenAI failure. Logs status / error code / type and a
 * redacted message — never the API key or the prompt.
 */
export function logOpenAiError(context: string, err: unknown): void {
  const summary = describeOpenAiError(err);
  if (err instanceof OpenAI.APIError) {
    console.error(
      `[openai:${context}] ${summary} — status=${err.status ?? "n/a"} code=${err.code ?? "n/a"} type=${err.type ?? "n/a"} model=${openAiModel()} message=${redactSecrets(err.message).slice(0, 300)}`,
    );
    return;
  }
  const message = err instanceof Error ? redactSecrets(err.message) : String(err);
  console.error(`[openai:${context}] ${summary} — model=${openAiModel()} message=${message.slice(0, 300)}`);
}

/**
 * Non-streaming chat completion. Returns the assistant message text.
 * Used by the AI writing assistant (compose) and JSON-mode helpers.
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<string> {
  const openai = getOpenAiClient();

  const res = await openai.chat.completions.create({
    model: openAiModel(),
    messages: options.messages,
    temperature: options.temperature ?? 0.5,
    max_tokens: options.max_tokens ?? 600,
    ...(options.response_format
      ? { response_format: options.response_format }
      : {}),
  });

  const content = res.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");
  return content;
}

/**
 * Streaming chat completion. Yields text deltas as they arrive so the UI can
 * render a live, token-by-token response.
 */
export async function* chatStream(
  options: ChatCompletionOptions
): AsyncGenerator<string, void, unknown> {
  const openai = getOpenAiClient();

  const stream = await openai.chat.completions.create({
    model: openAiModel(),
    messages: options.messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.max_tokens ?? 700,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}
