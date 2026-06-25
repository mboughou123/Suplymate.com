import { getCart, type SerializedCartItem } from "@/lib/cart-store";
import { chatCompletion, isOpenAiConfigured } from "@/lib/openai";

export type CartAnalysisInput = {
  destination?: string | null;
  deadline?: string | null;
  note?: string | null;
};

export type CartAnalysisResult = {
  summary: string;
  supplierNotes: { supplierId: string; supplierName: string; notes: string }[];
  questionsForBuyer: string[];
  disclaimers: string[];
  source: "openai" | "demo";
};

const DISCLAIMERS = [
  "Prices shown in your cart are supplier-listed snapshots and may be outdated.",
  "Suplymate does not verify availability, lead times, or certifications unless explicitly marked Verified.",
  "This analysis does not submit RFQs — you must review and submit yourself.",
];

function demoAnalysis(
  groups: Map<string, { supplierName: string; items: SerializedCartItem[] }>
): CartAnalysisResult {
  const supplierNotes = [...groups.entries()].map(([supplierId, g]) => ({
    supplierId,
    supplierName: g.supplierName,
    notes: `Request formal quotes for ${g.items.length} line item(s). Confirm MOQ, incoterms, and lead time directly with ${g.supplierName}.`,
  }));
  return {
    summary:
      `Your cart spans ${groups.size} supplier(s). Group RFQs by supplier so each can quote accurately. ` +
      "Compare responses on unit price, lead time, and payment terms — not on listed catalogue prices alone.",
    supplierNotes,
    questionsForBuyer: [
      "Do you need specific certifications (ISO, CE, etc.) on the quoted goods?",
      "What is your target delivery window and destination port?",
      "Are there packaging or labeling requirements?",
    ],
    disclaimers: DISCLAIMERS,
    source: "demo",
  };
}

export async function analyzeCart(
  userId: string,
  input: CartAnalysisInput = {}
): Promise<CartAnalysisResult> {
  const cart = await getCart(userId);
  const groups = new Map<string, { supplierName: string; items: typeof cart.items }>();
  for (const item of cart.items) {
    const g = groups.get(item.supplierId) ?? { supplierName: item.supplierName, items: [] };
    g.items.push(item);
    groups.set(item.supplierId, g);
  }

  if (cart.items.length === 0) {
    return {
      summary: "Your cart is empty — add products before requesting an analysis.",
      supplierNotes: [],
      questionsForBuyer: [],
      disclaimers: DISCLAIMERS,
      source: "demo",
    };
  }

  if (!isOpenAiConfigured()) {
    return demoAnalysis(groups);
  }

  const facts = [...groups.entries()].map(([id, g]) => ({
    supplierId: id,
    supplierName: g.supplierName,
    lines: g.items.map((i) => ({
      product: i.productName,
      qty: i.quantity,
      unit: i.unit,
      listedPrice: i.basePrice != null ? `${i.currency ?? "USD"} ${i.basePrice}` : "Not listed",
      moq: i.moq,
    })),
  }));

  const system = `You are Suplymate's procurement assistant. Analyze the buyer's cart using ONLY the facts provided.
Rules:
- Label facts as: [Database fact], [Supplier-listed price], [Suplymate recommendation], or [Missing data].
- NEVER invent prices, verification status, certifications, delivery dates, ratings, or supplier performance.
- NEVER auto-submit RFQs or claim you submitted anything.
- Output JSON: { "summary": string, "supplierNotes": [{ "supplierId", "supplierName", "notes" }], "questionsForBuyer": string[] }`;

  const user = JSON.stringify({
    cartFacts: facts,
    destination: input.destination ?? null,
    deadline: input.deadline ?? null,
    buyerNote: input.note ?? null,
  });

  try {
    const raw = await chatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      max_tokens: 900,
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(raw) as Partial<CartAnalysisResult>;
    return {
      summary: String(parsed.summary ?? "Analysis complete."),
      supplierNotes: Array.isArray(parsed.supplierNotes)
        ? parsed.supplierNotes.map((n) => ({
            supplierId: String(n.supplierId ?? ""),
            supplierName: String(n.supplierName ?? "Supplier"),
            notes: String(n.notes ?? ""),
          }))
        : [],
      questionsForBuyer: Array.isArray(parsed.questionsForBuyer)
        ? parsed.questionsForBuyer.map(String)
        : [],
      disclaimers: DISCLAIMERS,
      source: "openai",
    };
  } catch {
    return demoAnalysis(groups);
  }
}
