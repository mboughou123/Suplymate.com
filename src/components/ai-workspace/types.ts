import type { AiBlock, AiResponse, OrbState, RequirementSummary } from "@/lib/ai/aiService";
import type { WorkflowStageId } from "@/lib/ai/sourcing-plan";

export type { AiBlock, AiResponse, OrbState, RequirementSummary, WorkflowStageId };

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  blocks?: AiBlock[];
  requirement?: RequirementSummary;
  source?: "openai" | "demo";
};

export type PanelTab = "matches" | "prices" | "materials" | "strategy";

export const glass =
  "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]";
