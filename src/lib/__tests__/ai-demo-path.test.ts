import { describe, expect, it } from "vitest";
import { gatherDemoBlocks, ENGINE_NOTE_PLAN_DEMO, runAssistant } from "@/lib/ai/aiService";
import { parseRequirement } from "@/lib/ai/requirement-parser";
import { AI_DEMO_SUPPLIERS } from "@/lib/ai-demo-walkthrough";

describe("demo Mate path", () => {
  it("returns the walkthrough mills and never names a live-only engine", async () => {
    const req = parseRequirement("Find HDPE pipe suppliers");
    const { matches, blocks } = gatherDemoBlocks(req);
    expect(matches.map((m) => m.supplier.id)).toEqual(AI_DEMO_SUPPLIERS.map((s) => s.id));
    expect(blocks[0]).toMatchObject({ type: "supplier_matches", totalConsidered: 3 });

    const result = await runAssistant({ message: "Find HDPE pipe suppliers", history: [], mode: "demo" });
    expect(result.source).toBe("demo");
    expect(result.engineNote).toBe(ENGINE_NOTE_PLAN_DEMO);
    expect(result.reply).toMatch(/demo Mate/i);
    expect(result.reply).not.toMatch(/OpenAI key missing/i);
    const names = AI_DEMO_SUPPLIERS.map((s) => s.name);
    expect(names.some((name) => result.reply.includes(name))).toBe(true);
  });
});
