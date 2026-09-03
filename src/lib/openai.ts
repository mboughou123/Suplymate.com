// AI provider integration for Suplymate (Mate).
//
// Preference order:
//   1. XAI_API_KEY or GROK_API_KEY → xAI Grok (OpenAI-compatible https://api.x.ai/v1)
//   2. OPENAI_API_KEY → OpenAI Chat Completions
//   3. Neither → honest demo fallback (no fake live answers)
//
// Keys are read on the server ONLY. Never prefix with NEXT_PUBLIC_.

import OpenAI from "openai";

export type AiProvider = "grok" | "openai" | "demo";

const XAI_BASE_URL = "https://api.x.ai/v1";

function xaiKey(): string | undefined {
  return (
    process.env.XAI_API_KEY?.trim() ||
    process.env.GROK_API_KEY?.trim() ||
    undefined
  );
}

function openAiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

/** Active live provider, or "demo" when no key is configured. */
export function resolveAiProvider(): AiProvider {
  if (xaiKey()) return "grok";
  if (openAiKey()) return "openai";
  return "demo";
}

/** True when a live LLM key is available (Grok or OpenAI). */
export function isOpenAiConfigured(): boolean {
  return resolveAiProvider() !== "demo";
}

export function isAiConfigured(): boolean {
  return isOpenAiConfigured();
}

/** Chat model for the active provider. */
export function openAiModel(): string {
  const provider = resolveAiProvider();
  if (provider === "grok") {
    return process.env.GROK_MODEL?.trim() || process.env.XAI_MODEL?.trim() || "grok-2-latest";
  }
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

let client: OpenAI | null = null;
let clientProvider: AiProvider | null = null;

/** Lazily construct a singleton OpenAI-compatible client. Throws if none configured. */
export function getOpenAiClient(): OpenAI {
  const provider = resolveAiProvider();
  if (provider === "demo") {
    throw new Error("No AI API key configured (set XAI_API_KEY, GROK_API_KEY, or OPENAI_API_KEY)");
  }
  if (!client || clientProvider !== provider) {
    if (provider === "grok") {
      client = new OpenAI({
        apiKey: xaiKey()!,
        baseURL: XAI_BASE_URL,
      });
    } else {
      client = new OpenAI({ apiKey: openAiKey()! });
    }
    clientProvider = provider;
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

/**
 * Non-streaming chat completion. Returns the assistant message text.
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
 * Streaming chat completion. Yields text deltas as they arrive.
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
