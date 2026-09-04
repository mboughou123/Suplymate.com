// The Suplymate sourcing workflow. Steps are the same for every buyer; the
// detail text adapts to the parsed requirement so beginners get a concrete plan.

import type { ParsedRequirement } from "@/lib/ai/requirement-parser";

export type WorkflowStageId =
  | "requirement"
  | "material"
  | "discovery"
  | "price"
  | "delivery"
  | "matching"
  | "contact";

export const WORKFLOW_STAGES: { id: WorkflowStageId; label: string }[] = [
  { id: "requirement", label: "Requirement" },
  { id: "material", label: "Material identification" },
  { id: "discovery", label: "Supplier discovery" },
  { id: "price", label: "Price comparison" },
  { id: "delivery", label: "Delivery comparison" },
  { id: "matching", label: "Supplier matching" },
  { id: "contact", label: "Contact supplier" },
];

export type PlanStep = {
  n: number;
  title: string;
  detail: string;
  action?: { label: string; href: string };
};

export function stageForIntent(req: ParsedRequirement, hasMatches: boolean): WorkflowStageId {
  switch (req.intent) {
    case "material_info":
    case "material_substitute":
      return "material";
    case "price":
      return "price";
    case "delivery":
      return "delivery";
    case "compare_suppliers":
      return "matching";
    case "rfq":
      return "contact";
    case "find_suppliers":
      return hasMatches ? "matching" : "discovery";
    case "sourcing_plan":
      return req.materials.length ? "discovery" : "requirement";
    default:
      return "requirement";
  }
}

export function buildSourcingPlan(req: ParsedRequirement, matchCount: number): PlanStep[] {
  const mats = req.materials.map((m) => m.name);
  const matText = mats.length ? mats.slice(0, 3).join(", ") : "the material or component you need";
  const qty = req.quantity ? `${req.quantity.raw}` : "your quantity and how often you reorder";
  const where = req.location ? ` to ${req.location}` : "";
  const firstMaterial = req.materials[0];

  return [
    {
      n: 1,
      title: "Define requirements",
      detail: `Write down what the part or material must do, ${qty}, target delivery date${where}, and any certifications you must have (e.g. ISO 9001, CE, food-contact). Vague requirements produce vague quotes.`,
    },
    {
      n: 2,
      title: "Identify materials",
      detail: firstMaterial
        ? `You mentioned ${matText}. Common grades: ${(firstMaterial.grades ?? []).slice(0, 3).join("; ") || "ask the supplier for the standard grade"}. Alternatives worth pricing: ${firstMaterial.alternatives.slice(0, 2).join(", ")}.`
        : "Pick the material family first (metals, construction, packaging, components…) and then the exact grade or spec. Use Material intelligence to compare properties and typical uses.",
      action: { label: "Open materials", href: "/materials" },
    },
    {
      n: 3,
      title: "Find suppliers",
      detail:
        matchCount > 0
          ? `Suplymate found ${matchCount} listed supplier${matchCount === 1 ? "" : "s"} relevant to ${matText}. Shortlist 3–5 and read their profiles, certifications and reviews.`
          : `Search the directory for ${matText}${where} and shortlist 3–5 suppliers. Prefer verified profiles and those with real photos and certifications.`,
      action: { label: "Browse suppliers", href: "/suppliers" },
    },
    {
      n: 4,
      title: "Compare prices",
      detail:
        "Ask every shortlisted supplier for the same specification and Incoterm (e.g. FOB vs CIF) so quotes are comparable. Watch the material price chart to understand whether the market is rising or falling.",
      action: { label: "Price charts", href: "/materials" },
    },
    {
      n: 5,
      title: "Compare delivery",
      detail: `Compare stated lead times, shipping route${where} and MOQ. A cheaper unit price with a 12-week lead time is often more expensive once you count stock-outs.`,
    },
    {
      n: 6,
      title: "Contact suppliers",
      detail: "Open a conversation from the supplier profile. Ask about MOQ flexibility, samples, payment terms and who owns quality inspection.",
    },
    {
      n: 7,
      title: "Request quotes",
      detail: "Send one structured RFQ to your shortlist with quantity, spec, destination and deadline. Suplymate keeps every quote in one place for comparison.",
      action: { label: "My RFQs", href: "/rfqs" },
    },
    {
      n: 8,
      title: "Select supplier",
      detail: "Weigh price, lead time, quality evidence and trust — not price alone. Order a paid sample before the first bulk order and agree written terms.",
    },
  ];
}
