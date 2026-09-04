// Turns a free-text sourcing request into a structured requirement the matching
// engine and material intelligence can act on. Heuristic (no model call) so it
// works in demo mode and keeps the LLM grounded when it is available.

import { detectIndustries, type Industry } from "@/data/industries";
import { detectMaterials, type MaterialCatalogEntry } from "@/data/material-catalog";

export type Intent =
  | "find_suppliers"
  | "compare_suppliers"
  | "material_info"
  | "material_substitute"
  | "price"
  | "delivery"
  | "sourcing_plan"
  | "rfq"
  | "general";

export type Quantity = { value: number; unit: string; raw: string };

export type ParsedRequirement = {
  text: string;
  intent: Intent;
  materials: MaterialCatalogEntry[];
  industries: Industry[];
  quantity: Quantity | null;
  /** Destination / preferred sourcing region as written by the user. */
  location: string | null;
  /** Whether the user reads as a beginner who needs guidance, not just data. */
  beginner: boolean;
  /** Significant tokens for fuzzy supplier matching. */
  keywords: string[];
};

const UNIT_WORDS =
  "tons?|tonnes?|t|kg|kilograms?|lbs?|pounds?|pcs?|pieces?|units?|meters?|metres?|m|mm|sheets?|coils?|pallets?|boxes?|containers?|rolls?|bags?|m2|m²|m3|m³|bf|board feet";

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "need", "want", "find", "some",
  "what", "which", "where", "when", "have", "are", "you", "can", "please", "about", "best",
  "cheapest", "supplier", "suppliers", "compare", "price", "prices", "delivery", "deliver",
  "delivered", "help", "looking", "would", "like", "should", "there", "their", "them", "they",
]);

function detectIntent(lower: string): Intent {
  if (/\b(rfq|request for quote|quote request|send (a )?(request|rfq))\b/.test(lower)) return "rfq";
  if (/\b(replace|substitute|alternative|alternatives|instead of|cheaper material|swap)\b/.test(lower)) {
    return "material_substitute";
  }
  if (/\b(compare|comparison|versus|vs\.?|which (one|supplier) is better|best delivery)\b/.test(lower)) {
    return "compare_suppliers";
  }
  if (/\b(price|prices|pricing|cost|costs|cheap|cheapest|expensive|budget|how much)\b/.test(lower)) {
    return "price";
  }
  if (/\b(delivery|lead time|shipping|ship|deliver|how long|fastest)\b/.test(lower)) return "delivery";
  if (/\b(start|starting|launch|build a house|building a house|new business|first time|beginner|how do i|where do i start|what do i need|plan|strategy|roadmap|steps)\b/.test(lower)) {
    return "sourcing_plan";
  }
  if (/\b(difference between|what is|what's|properties|grade|grades|spec|specification|applications?|used for|explain)\b/.test(lower)) {
    return "material_info";
  }
  if (/\b(find|source|sourcing|looking for|need|want|supplier|suppliers|manufacturer|manufacturers|vendor|vendors|mill|mills|factory)\b/.test(lower)) {
    return "find_suppliers";
  }
  return "general";
}

function parseQuantity(text: string): Quantity | null {
  const re = new RegExp(`(\\d[\\d,.]*)\\s*(${UNIT_WORDS})\\b`, "i");
  const m = text.match(re);
  if (!m) return null;
  const value = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return { value, unit: m[2].toLowerCase(), raw: m[0] };
}

function parseLocation(text: string): string | null {
  // "in California", "to San Diego", "delivered to Rotterdam, Netherlands", "from Turkey"
  const re =
    /\b(?:in|to|near|from|within|around)\s+((?:[A-Z][\w'-]+)(?:\s+(?:[A-Z][\w'-]+|of|the|and|&))*(?:,\s*[A-Z][\w'-]+(?:\s+[A-Z][\w'-]+)*)?)/g;
  let best: string | null = null;
  for (const m of text.matchAll(re)) {
    const candidate = m[1].trim();
    // Skip material/industry words that happen to be capitalised at sentence start.
    if (/^(I|We|Please|Find|Compare|Need|Steel|Aluminum|Aluminium|Copper)$/i.test(candidate)) continue;
    if (!best || candidate.length > best.length) best = candidate;
  }
  return best;
}

function keywordsOf(lower: string): string[] {
  return Array.from(
    new Set(
      lower
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3 && !STOP.has(t)),
    ),
  ).slice(0, 12);
}

export function parseRequirement(text: string): ParsedRequirement {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const materials = detectMaterials(trimmed);
  const industries = detectIndustries(trimmed);
  const beginner =
    /\b(start(ing)? (a|my) (business|company|factory|brand)|build(ing)? a house|don'?t know|not sure|new to|first time|beginner|where do i (start|begin)|what (materials|do i need))\b/.test(
      lower,
    );

  let intent = detectIntent(lower);
  if (intent === "general" && materials.length > 0) intent = "material_info";
  if (beginner && intent !== "material_info") intent = "sourcing_plan";

  return {
    text: trimmed,
    intent,
    materials,
    industries,
    quantity: parseQuantity(trimmed),
    location: parseLocation(trimmed),
    beginner,
    keywords: keywordsOf(lower),
  };
}
