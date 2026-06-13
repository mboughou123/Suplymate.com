// AI writing assistant for the messaging system. Uses OpenAI when
// OPENAI_API_KEY is set; otherwise returns high-quality templates so the
// feature works out of the box (demo mode).

export type ComposeMode =
  | "message"
  | "rfq"
  | "negotiate"
  | "summarize"
  | "translate";

export type ComposePayload = {
  supplierName?: string;
  buyerName?: string;
  product?: string;
  quantity?: string;
  destination?: string;
  targetPrice?: string;
  deadline?: string;
  prompt?: string; // free-form buyer intent
  text?: string; // for translate / summarize
  targetLanguage?: string;
};

const PROMPTS: Record<ComposeMode, string> = {
  message:
    "Write a concise, professional B2B sourcing inquiry message to a supplier. Be polite and specific. Plain text only.",
  rfq: "Write a clear, structured Request for Quotation (RFQ). Use short labeled lines. Plain text only.",
  negotiate:
    "Act as a procurement negotiation coach. Give 4-6 concrete, ethical negotiation strategies as a numbered list. Plain text only.",
  summarize:
    "Summarize this B2B sourcing conversation into 4-6 short bullet points capturing decisions, prices, quantities, and next steps. Plain text only.",
  translate:
    "Translate the user's text accurately into the requested target language. Return only the translation.",
};

function fallbackMessage(p: ComposePayload): string {
  const supplier = p.supplierName || "Supplier";
  const product = p.product || p.prompt || "the products listed on your profile";
  const dest = p.destination || "our facility";
  return [
    `Dear ${supplier} team,`,
    ``,
    `We are sourcing ${product} for an upcoming project and would like to request more information.`,
    ``,
    `Could you please share:`,
    `• Unit pricing and any volume discounts`,
    `• Minimum order quantity (MOQ)`,
    `• Lead time and shipping options to ${dest}`,
    `• Relevant certifications (ISO, CE, etc.)`,
    ``,
    `We look forward to your quotation.`,
    ``,
    `Best regards,`,
    `${p.buyerName || "Procurement Team"}`,
  ].join("\n");
}

function fallbackRfq(p: ComposePayload): string {
  return [
    `REQUEST FOR QUOTATION (RFQ)`,
    ``,
    `• Product: ${p.product || "[product name]"}`,
    `• Quantity: ${p.quantity || "[quantity / units]"}`,
    `• Destination: ${p.destination || "[delivery destination]"}`,
    `• Target price: ${p.targetPrice || "[optional target price]"}`,
    `• Required by: ${p.deadline || "[delivery deadline]"}`,
    ``,
    `Specifications:`,
    `- [material grade / dimensions / tolerance]`,
    `- [packaging requirements]`,
    ``,
    `Please include in your reply: unit price, MOQ, lead time, payment terms, Incoterms, and certifications.`,
  ].join("\n");
}

function fallbackNegotiate(p: ComposePayload): string {
  const product = p.product || "this order";
  return [
    `Negotiation strategy for ${product}:`,
    `1. Anchor on volume — share your annual/recurring demand to unlock tiered pricing.`,
    `2. Request 2–3 competing quotes and reference them to benchmark fairly.`,
    `3. Ask for a paid sample that is refundable against the first bulk order.`,
    `4. Negotiate Incoterms (e.g., FOB vs CIF) — freight often hides 5–10% of cost.`,
    `5. Trade payment terms for price: offer a deposit for a lower unit price.`,
    `6. Lock lead time and penalties in writing before committing volume.`,
  ].join("\n");
}

function fallbackSummarize(p: ComposePayload): string {
  const text = (p.text || "").trim();
  if (!text) return "No conversation content to summarize yet.";
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const preview = lines.slice(0, 5).map((l) => `• ${l.slice(0, 120)}`);
  return [
    `Conversation summary (${lines.length} messages):`,
    ...preview,
    lines.length > 5 ? `• …and ${lines.length - 5} more` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function fallback(mode: ComposeMode, p: ComposePayload): string {
  switch (mode) {
    case "message":
      return fallbackMessage(p);
    case "rfq":
      return fallbackRfq(p);
    case "negotiate":
      return fallbackNegotiate(p);
    case "summarize":
      return fallbackSummarize(p);
    case "translate":
      return p.text
        ? `${p.text}\n\n(Live translation requires an OpenAI API key — showing original text.)`
        : "";
  }
}

export async function compose(
  mode: ComposeMode,
  payload: ComposePayload
): Promise<{ text: string; source: "openai" | "demo" }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { text: fallback(mode, payload), source: "demo" };
  }

  const userContent =
    mode === "translate"
      ? `Target language: ${payload.targetLanguage || "English"}\n\nText:\n${payload.text || ""}`
      : mode === "summarize"
        ? `Conversation:\n${payload.text || ""}`
        : JSON.stringify(payload);

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
          { role: "system", content: PROMPTS[mode] },
          { role: "user", content: userContent },
        ],
        temperature: 0.5,
        max_tokens: 600,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response");
    return { text: content, source: "openai" };
  } catch {
    return { text: fallback(mode, payload), source: "demo" };
  }
}
