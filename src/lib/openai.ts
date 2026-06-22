// OpenAI integration for Suplymate AI features.
//
// Local: add OPENAI_API_KEY=sk-... to .env.local (never commit this file).
// Production: Vercel → Project Settings → Environment Variables → OPENAI_API_KEY.
// Without a key, AI features use built-in demo fallbacks.
//
// The API key is read on the server ONLY. It is never exposed to the browser
// (no NEXT_PUBLIC_ prefix) and is never logged.

import OpenAI from "openai";

/** Chat model. Override with OPENAI_MODEL; falls back to a sane default. */
export function openAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

let client: OpenAI | null = null;

/** Lazily construct a singleton OpenAI client. Throws if no key is configured. */
export function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  if (!client) client = new OpenAI({ apiKey });
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
