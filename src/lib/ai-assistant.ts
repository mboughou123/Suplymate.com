// Conversational AI procurement assistant.
//
// - Uses OpenAI (chat.completions) when OPENAI_API_KEY is set, otherwise a
//   safe, honest template fallback (demo mode).
// - Grounds answers with a SMALL, relevant slice of real DB data (RAG-lite):
//   only verified/visible suppliers and product categories. No private data,
//   no whole-DB dumps.

import { chatCompletion, chatStream, isOpenAiConfigured, type ChatMessage } from "@/lib/openai";
import { getSuppliersFromDb, getProductsFromDb } from "@/lib/data-service";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_MESSAGES = 12;

export const SYSTEM_PROMPT = `You are Suplymate's AI procurement assistant, a professional advisor for B2B industrial sourcing and supply-chain decisions.

You help buyers with: finding and comparing suppliers, pricing and cost ranges, shipping and lead times, minimum order quantities (MOQs), preparing RFQs, supplier risk, certifications, procurement planning, and general sourcing strategy.

STRICT RULES:
- Only describe a supplier as "verified" if the provided Suplymate data explicitly marks it verified. Otherwise say it is "listed" or "not yet verified".
- Clearly distinguish facts that come from the provided Suplymate data versus your own general guidance. Prefix general advice with phrasing like "Generally," or "As a rule of thumb,".
- Never invent specific prices, certifications, delivery times, ratings, MOQs, or supplier details. If you don't have the data, say so and explain how the buyer can find it (e.g. send an RFQ, check the supplier profile).
- Do not give guaranteed legal, financial, compliance, or safety conclusions. Recommend the buyer independently verify important decisions and consult the relevant professionals.
- Be concise, structured, and practical. Use short paragraphs or bullet points. Plain text only (no markdown headings).
- If a question is outside procurement/sourcing, briefly steer back to how Suplymate can help.`;

/**
 * Build a small, relevant context block from real DB data. Best-effort: returns
 * an empty string on any failure so the assistant still works.
 */
export async function buildSupplierContext(message: string): Promise<string> {
  try {
    const lower = message.toLowerCase();
    const [suppliers, products] = await Promise.all([
      getSuppliersFromDb(),
      getProductsFromDb(),
    ]);

    // Prefer suppliers whose name/category/country/products match the query.
    const scored = suppliers
      .map((s) => {
        const hay = [
          s.name,
          s.category,
          s.country,
          s.location,
          ...(s.products ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const tokens = lower.split(/\s+/).filter((t) => t.length > 3);
        const matches = tokens.filter((t) => hay.includes(t)).length;
        return { s, matches };
      })
      .sort((a, b) => {
        if (b.matches !== a.matches) return b.matches - a.matches;
        return (b.s.score ?? b.s.reliabilityScore ?? 0) - (a.s.score ?? a.s.reliabilityScore ?? 0);
      })
      .slice(0, 6)
      .map(({ s }) => s);

    if (scored.length === 0) return "";

    const supplierLines = scored.map((s) => {
      const verified =
        s.verified === true || s.verificationStatus === "verified"
          ? "verified"
          : "not verified";
      const certCount =
        (s.certificationsDetailed?.length ?? 0) ||
        (s.certificationImages?.length ?? 0);
      const parts = [
        `- ${s.name}`,
        s.category ? `category: ${s.category}` : null,
        s.country || s.location ? `location: ${s.country ?? s.location}` : null,
        `status: ${verified}`,
        typeof s.trustScore === "number" ? `trust score: ${s.trustScore}/100` : null,
        certCount ? `certifications claimed: ${certCount}` : null,
        s.moq ? `MOQ: ${s.moq}` : null,
      ].filter(Boolean);
      return parts.join(" | ");
    });

    const categories = Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    ).slice(0, 10);

    return [
      "SUPLYMATE DATA (use only this for supplier-specific facts; do not fabricate beyond it):",
      "Relevant suppliers:",
      ...supplierLines,
      categories.length ? `Product categories on Suplymate: ${categories.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

/** Honest, useful template reply when no OpenAI key is configured. */
export function demoReply(message: string): string {
  const lower = message.toLowerCase();
  const intro =
    "You're in demo mode — live AI responses require an OpenAI API key. Here's general guidance:";

  if (lower.includes("rfq")) {
    return `${intro}\n\nA strong RFQ usually includes:\n• Product name and exact specifications (grade, dimensions, tolerances)\n• Quantity and any volume tiers\n• Destination and required Incoterms (FOB, CIF, etc.)\n• Target price (optional) and required delivery date\n• Packaging and certification requirements (ISO, CE, etc.)\n• Requested payment terms\n\nYou can browse suppliers in the directory and start a conversation to send your RFQ directly.`;
  }
  if (lower.includes("certification") || lower.includes("iso") || lower.includes("ce")) {
    return `${intro}\n\nCommon certifications to check depend on the product, but typically include ISO 9001 (quality management), industry-specific standards (e.g. CE for the EU market), and any material/safety certs relevant to your application. Always request the actual certificate and verify it independently — a claim alone is not proof.`;
  }
  if (lower.includes("risk")) {
    return `${intro}\n\nBefore choosing a supplier, evaluate: business legitimacy and references, verified vs unverified status on Suplymate, quality/certifications, financial stability, lead-time reliability, communication quality, and clear written terms (payment, Incoterms, penalties). Order a paid sample and verify important claims independently.`;
  }
  return `${intro}\n\nTell me what you need to source — product, quantity, destination, and timeline — and I can outline how to find suppliers, compare options, and prepare an RFQ. Use the supplier directory to see listed and verified suppliers, and start a conversation to request real quotes.`;
}

type ReplyArgs = { message: string; history: ChatMessage[] };

async function buildMessages({ message, history }: ReplyArgs): Promise<ChatMessage[]> {
  const context = await buildSupplierContext(message);
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  if (context) messages.push({ role: "system", content: context });
  for (const m of history.slice(-MAX_HISTORY_MESSAGES)) {
    if (m.role === "user" || m.role === "assistant") {
      messages.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) });
    }
  }
  messages.push({ role: "user", content: message });
  return messages;
}

/** Non-streaming reply. Returns the assistant text and which engine produced it. */
export async function getAiReply(
  args: ReplyArgs
): Promise<{ reply: string; source: "openai" | "demo" }> {
  if (!isOpenAiConfigured()) {
    return { reply: demoReply(args.message), source: "demo" };
  }
  const messages = await buildMessages(args);
  const reply = await chatCompletion({ messages, temperature: 0.4, max_tokens: 700 });
  return { reply, source: "openai" };
}

/** Streaming reply generator (OpenAI only). */
export async function streamAiReply(args: ReplyArgs): Promise<AsyncGenerator<string>> {
  const messages = await buildMessages(args);
  return chatStream({ messages, temperature: 0.4, max_tokens: 700 });
}
