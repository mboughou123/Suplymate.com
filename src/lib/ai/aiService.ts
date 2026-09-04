// AI procurement service.
//
//   AiWorkspace (client) -> /api/ai -> runAssistant()
//     -> parseRequirement()          (structured intent, materials, qty, place)
//     -> matchSuppliers()            (REAL suppliers only, scored + explained)
//     -> getMaterialsWithPricing()   (catalog materials with price provenance)
//     -> buildSourcingPlan()         (workflow guidance)
//     -> OpenAI (optional) for the narrative, grounded on the blocks above
//
// The model is never the source of supplier facts: suppliers, prices and
// materials come from Suplymate data and are rendered as cards by the UI. When
// OpenAI is not configured the narrative is composed deterministically.

import { chatCompletion, isOpenAiConfigured, type ChatMessage } from "@/lib/openai";
import { getSuppliersFromDb } from "@/lib/data-service";
import { getMaterialsWithPricing, type MaterialWithProvenance } from "@/lib/pricing/pricingService";
import { getCatalogMaterial, type MaterialCatalogEntry } from "@/data/material-catalog";
import { parseRequirement, type ParsedRequirement } from "@/lib/ai/requirement-parser";
import { matchSuppliers, type SupplierMatch } from "@/lib/ai/supplier-matching";
import { buildSourcingPlan, stageForIntent, type PlanStep, type WorkflowStageId } from "@/lib/ai/sourcing-plan";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_MESSAGES = 12;

export type OrbState =
  | "searching"
  | "working"
  | "solving"
  | "listening"
  | "connecting"
  | "weaving"
  | "composing"
  | "breathing"
  | "shaping";

export type PriceRow = {
  id: string;
  name: string;
  price: number;
  unit: string;
  currency: string;
  dailyChange: number;
  monthlyChange: number;
  signal: string;
  source: string;
  sourceLabel: string;
  isLive: boolean;
  lastUpdatedAt: string | null;
};

export type MaterialIntel = {
  id: string;
  name: string;
  summary: string;
  properties: string[];
  applications: string[];
  grades: string[];
  alternatives: { id: string | null; name: string }[];
  priceDrivers: string[];
  manufacturingNotes: string[];
  price: PriceRow | null;
};

export type AiBlock =
  | { type: "supplier_matches"; requirement: string; matches: SupplierMatch[]; totalConsidered: number }
  | { type: "price_comparison"; rows: PriceRow[] }
  | { type: "material_intel"; materials: MaterialIntel[] }
  | { type: "sourcing_plan"; steps: PlanStep[] };

export type RequirementSummary = {
  intent: ParsedRequirement["intent"];
  materials: string[];
  industries: string[];
  quantity: string | null;
  location: string | null;
  beginner: boolean;
};

export type AiResponse = {
  reply: string;
  source: "openai" | "demo";
  state: OrbState;
  stage: WorkflowStageId;
  requirement: RequirementSummary;
  blocks: AiBlock[];
};

function toPriceRow(m: MaterialWithProvenance): PriceRow {
  return {
    id: m.id,
    name: m.name,
    price: m.currentPrice,
    unit: m.unit,
    currency: m.currency,
    dailyChange: m.dailyChange,
    monthlyChange: m.monthlyChange,
    signal: m.signal,
    source: m.source,
    sourceLabel: m.sourceLabel,
    isLive: m.isLive,
    lastUpdatedAt: m.lastUpdatedAt,
  };
}

function toIntel(entry: MaterialCatalogEntry, priced: Map<string, MaterialWithProvenance>): MaterialIntel {
  return {
    id: entry.id,
    name: entry.name,
    summary: entry.summary,
    properties: entry.properties,
    applications: entry.applications,
    grades: entry.grades ?? [],
    alternatives: entry.alternatives.map((a) => {
      const cat = getCatalogMaterial(a);
      return { id: cat?.id ?? null, name: cat?.name ?? a };
    }),
    priceDrivers: entry.priceDrivers,
    manufacturingNotes: entry.manufacturingNotes,
    price: priced.has(entry.id) ? toPriceRow(priced.get(entry.id)!) : null,
  };
}

function stateFor(req: ParsedRequirement): OrbState {
  switch (req.intent) {
    case "find_suppliers":
      return "searching";
    case "compare_suppliers":
    case "price":
      return "solving";
    case "material_info":
    case "material_substitute":
      return "weaving";
    case "sourcing_plan":
      return "shaping";
    case "rfq":
      return "composing";
    case "delivery":
      return "connecting";
    default:
      return "working";
  }
}

export type AssistantInput = {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
};

/** Gather grounded blocks for a requirement. Never throws. */
export async function gatherBlocks(req: ParsedRequirement): Promise<{ blocks: AiBlock[]; matches: SupplierMatch[] }> {
  const blocks: AiBlock[] = [];
  let matches: SupplierMatch[] = [];

  const [suppliers, materials] = await Promise.all([
    getSuppliersFromDb().catch(() => []),
    getMaterialsWithPricing().catch(() => [] as MaterialWithProvenance[]),
  ]);
  const priced = new Map(materials.map((m) => [m.id, m]));

  const wantsSuppliers = ["find_suppliers", "compare_suppliers", "rfq", "delivery", "sourcing_plan", "price"].includes(
    req.intent,
  );
  if (wantsSuppliers && suppliers.length) {
    matches = matchSuppliers(suppliers, req, req.intent === "compare_suppliers" ? 3 : 5);
    if (matches.length) {
      blocks.push({ type: "supplier_matches", requirement: req.text, matches, totalConsidered: suppliers.length });
    }
  }

  const relevantMaterials = req.materials.length
    ? req.materials
    : req.industries.length
      ? []
      : [];

  if (relevantMaterials.length) {
    const intel = relevantMaterials.slice(0, 3).map((m) => toIntel(m, priced));
    if (req.intent === "material_substitute") {
      // Add the alternatives so the buyer can compare properties side by side.
      for (const alt of relevantMaterials[0].alternatives) {
        const cat = getCatalogMaterial(alt);
        if (cat && !intel.some((i) => i.id === cat.id) && intel.length < 4) intel.push(toIntel(cat, priced));
      }
    }
    blocks.push({ type: "material_intel", materials: intel });
  }

  const priceRows = relevantMaterials
    .flatMap((m) => [m.id, ...m.alternatives])
    .map((id) => priced.get(id))
    .filter((m): m is MaterialWithProvenance => Boolean(m));
  const uniqueRows = Array.from(new Map(priceRows.map((m) => [m.id, m])).values());
  if ((req.intent === "price" || req.intent === "material_substitute" || req.intent === "compare_suppliers") && uniqueRows.length) {
    blocks.push({ type: "price_comparison", rows: uniqueRows.slice(0, 6).map(toPriceRow) });
  } else if (req.intent === "price" && materials.length) {
    blocks.push({ type: "price_comparison", rows: materials.slice(0, 6).map(toPriceRow) });
  }

  if (req.intent === "sourcing_plan" || req.beginner) {
    blocks.push({ type: "sourcing_plan", steps: buildSourcingPlan(req, matches.length) });
  }

  return { blocks, matches };
}

function describeBlocksForModel(blocks: AiBlock[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    if (b.type === "supplier_matches") {
      lines.push(`SUPPLIER MATCHES (already shown to the user as cards; ${b.totalConsidered} suppliers considered):`);
      for (const m of b.matches) {
        const s = m.supplier;
        lines.push(
          `- ${s.name} | ${s.country ?? s.location} | ${s.verified ? "VERIFIED" : "listed, not verified"} | match ${m.overall}% | ${m.reasons.join("; ")}${m.gaps.length ? ` | gaps: ${m.gaps.join("; ")}` : ""}`,
        );
      }
    }
    if (b.type === "price_comparison") {
      lines.push("MATERIAL PRICES (shown as a table):");
      for (const r of b.rows) {
        lines.push(`- ${r.name}: ${r.price} ${r.unit} (${r.isLive ? "provider data" : "REFERENCE seed value, not live"}; 30d ${r.monthlyChange > 0 ? "+" : ""}${r.monthlyChange}%)`);
      }
    }
    if (b.type === "material_intel") {
      lines.push("MATERIAL INTELLIGENCE (shown as cards):");
      for (const m of b.materials) {
        lines.push(`- ${m.name}: ${m.summary} Grades: ${m.grades.join("; ") || "n/a"}. Alternatives: ${m.alternatives.map((a) => a.name).join(", ")}.`);
      }
    }
    if (b.type === "sourcing_plan") {
      lines.push("SOURCING PLAN (shown as an 8-step plan card).");
    }
  }
  return lines.join("\n");
}

export const SYSTEM_PROMPT = `You are Mate, Suplymate's AI industrial sourcing expert. You help business owners, procurement teams and beginners find suppliers, compare price / delivery / location / quality, understand materials and make better procurement decisions.

RULES
- Supplier facts come ONLY from the SUPLYMATE DATA block. Never name a supplier that is not in it. If none are relevant, say so and explain how to proceed (directory search, RFQ).
- Only call a supplier "verified" if the data says VERIFIED.
- Never invent prices, lead times, MOQs, certifications or ratings. Reference values marked "REFERENCE seed value" must be described as indicative reference series, not live market prices.
- The user interface already renders cards/tables for the data. Do not repeat every field — interpret it: what stands out, trade-offs, what to ask next.
- Prefix your own general knowledge with "Generally," or "As a rule of thumb,".
- For beginners, be concrete and encouraging: next 2–3 actions.
- Plain text, short paragraphs or bullets, no markdown headings. Under 220 words.`;

function composeDemoReply(req: ParsedRequirement, blocks: AiBlock[]): string {
  const parts: string[] = [];
  const matches = blocks.find((b) => b.type === "supplier_matches") as Extract<AiBlock, { type: "supplier_matches" }> | undefined;
  const intel = blocks.find((b) => b.type === "material_intel") as Extract<AiBlock, { type: "material_intel" }> | undefined;
  const prices = blocks.find((b) => b.type === "price_comparison") as Extract<AiBlock, { type: "price_comparison" }> | undefined;
  const plan = blocks.find((b) => b.type === "sourcing_plan");

  const matText = req.materials.map((m) => m.name).join(", ");
  const where = req.location ? ` around ${req.location}` : "";

  if (matches) {
    const top = matches.matches[0];
    const verified = matches.matches.filter((m) => m.supplier.verified).length;
    parts.push(
      `I checked ${matches.totalConsidered} listed suppliers and shortlisted ${matches.matches.length}${matText ? ` for ${matText}` : ""}${where}. ${top.supplier.name} ranks first at ${top.overall}% because ${top.reasons.slice(0, 2).join(" and ").toLowerCase()}.` +
        (verified ? ` ${verified} of them ${verified === 1 ? "is" : "are"} verified by Suplymate.` : " None of them is independently verified yet, so treat their claims as supplier-provided."),
    );
    const gaps = Array.from(new Set(matches.matches.flatMap((m) => m.gaps))).slice(0, 2);
    if (gaps.length) parts.push(`Gaps to close before you decide: ${gaps.join("; ").toLowerCase()}.`);
  } else if (["find_suppliers", "compare_suppliers", "rfq", "delivery"].includes(req.intent)) {
    parts.push(
      `I couldn't find a listed supplier that clearly matches${matText ? ` ${matText}` : " that request"}${where}. Try the directory with a broader category, or describe the product family (e.g. "steel pipes" instead of a part number) and I will match again.`,
    );
  }

  if (intel) {
    const m = intel.materials[0];
    parts.push(
      `${m.name}: ${m.summary} Typical uses include ${m.applications.slice(0, 3).join(", ").toLowerCase()}. ${m.grades.length ? `Common grades: ${m.grades.slice(0, 2).join("; ")}.` : ""} Alternatives worth pricing: ${m.alternatives.map((a) => a.name).slice(0, 3).join(", ")}.`,
    );
    if (req.intent === "material_substitute" && m.alternatives.length) {
      parts.push(`Generally, a substitute only works if it meets the same load, corrosion and regulatory requirements — confirm with the supplier's datasheet before switching.`);
    }
  }

  if (prices) {
    const ref = prices.rows.filter((r) => !r.isLive).length;
    parts.push(
      `The price table shows ${prices.rows.length} material${prices.rows.length === 1 ? "" : "s"}.` +
        (ref ? ` ${ref === prices.rows.length ? "These are" : `${ref} of them are`} reference series, not live quotes — connect a pricing provider for live data.` : "") +
        " As a rule of thumb, ask every supplier for the same Incoterm so quotes are comparable.",
    );
  }

  if (plan) {
    parts.push(
      req.beginner
        ? "You don't need to know everything up front. Start with step 1 (write the requirement) and step 2 (pick the material family) — I can help with both here."
        : "The sourcing plan below walks from requirement to selected supplier. Each step links to the right place in Suplymate.",
    );
  }

  if (parts.length === 0) {
    parts.push(
      "Tell me what you need to source — product or material, quantity, destination and timeline — and I'll match listed suppliers, compare price context and outline the next steps. Try: \"Find aluminum suppliers in California\" or \"I want to build a house, what materials do I need?\"",
    );
  }

  if (!isOpenAiConfigured()) {
    parts.push("(Demo mode: supplier and material data are real Suplymate records; narrative generation is rule-based until an OpenAI key is configured.)");
  }
  return parts.join("\n\n");
}

export async function runAssistant(input: AssistantInput): Promise<AiResponse> {
  const req = parseRequirement(input.message);
  const { blocks, matches } = await gatherBlocks(req);
  const stage = stageForIntent(req, matches.length > 0);
  const requirement: RequirementSummary = {
    intent: req.intent,
    materials: req.materials.map((m) => m.name),
    industries: req.industries.map((i) => i.name),
    quantity: req.quantity?.raw ?? null,
    location: req.location,
    beginner: req.beginner,
  };

  if (!isOpenAiConfigured()) {
    return { reply: composeDemoReply(req, blocks), source: "demo", state: stateFor(req), stage, requirement, blocks };
  }

  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  const grounded = describeBlocksForModel(blocks);
  messages.push({
    role: "system",
    content: `SUPLYMATE DATA\n${grounded || "No matching supplier or material records for this request."}\n\nPARSED REQUIREMENT: intent=${req.intent}; materials=${requirement.materials.join(", ") || "none"}; quantity=${requirement.quantity ?? "n/a"}; location=${requirement.location ?? "n/a"}; beginner=${req.beginner}.`,
  });
  for (const m of input.history.slice(-MAX_HISTORY_MESSAGES)) {
    messages.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) });
  }
  messages.push({ role: "user", content: input.message });

  try {
    const reply = await chatCompletion({ messages, temperature: 0.35, max_tokens: 600 });
    return { reply, source: "openai", state: stateFor(req), stage, requirement, blocks };
  } catch {
    return { reply: composeDemoReply(req, blocks), source: "demo", state: stateFor(req), stage, requirement, blocks };
  }
}
