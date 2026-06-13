import type { FakeAiResponse } from "@/components/ProcurementSuggestionCard";
import { generateFakeAiResponse } from "@/lib/ai-fallback";

const SYSTEM_PROMPT = `You are Suplymate, an AI procurement advisor for B2B industrial sourcing.
Respond ONLY with valid JSON matching this schema:
{
  "summary": "2-3 sentence analysis",
  "recommendedSupplier": "supplier name",
  "estimatedPrice": "price string with currency",
  "delivery": "delivery estimate",
  "risk": "Low" | "Medium" | "High",
  "recommendation": "clear action recommendation"
}
Be professional, specific, and practical. Use realistic supplier names from industrial markets.`;

export async function getAiProcurementResponse(
  userMessage: string
): Promise<{ response: FakeAiResponse; source: "openai" | "demo" }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { response: generateFakeAiResponse(userMessage), source: "demo" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content) as FakeAiResponse;
    if (
      !parsed.summary ||
      !parsed.recommendedSupplier ||
      !parsed.recommendation
    ) {
      throw new Error("Invalid shape");
    }

    return {
      response: {
        summary: parsed.summary,
        recommendedSupplier: parsed.recommendedSupplier,
        estimatedPrice: parsed.estimatedPrice ?? "—",
        delivery: parsed.delivery ?? "—",
        risk: parsed.risk ?? "Medium",
        recommendation: parsed.recommendation,
      },
      source: "openai",
    };
  } catch {
    return { response: generateFakeAiResponse(userMessage), source: "demo" };
  }
}
