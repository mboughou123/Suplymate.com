// OpenAI integration for Suplymate AI features.
//
// Local: add OPENAI_API_KEY=sk-... to .env.local (never commit this file).
// Production: Vercel → Project Settings → Environment Variables → OPENAI_API_KEY.
// Without a key, AI features use built-in demo fallbacks.

export const OPENAI_MODEL = "gpt-4o-mini";

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatCompletionOptions = {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
};

export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.5,
      max_tokens: options.max_tokens ?? 600,
      ...(options.response_format
        ? { response_format: options.response_format }
        : {}),
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");
  return content;
}
