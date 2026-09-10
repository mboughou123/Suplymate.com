import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MATE_TAGLINE } from "@/lib/mate-branding";
import en from "../../../messages/en.json";

const LOCKED =
  "Meet Mate — 1 AI, 3 agents (Scout / Compare / Watch) working for you.";

describe("Mate locked marketing line", () => {
  it("exports the Market Research wording", () => {
    expect(MATE_TAGLINE).toBe(LOCKED);
  });

  it("is used on homepage AI section and AI Assistant copy", () => {
    expect(en.homeAiDemo.title).toBe(LOCKED);
    expect(en.aiAssistant.mateTitle).toBe(LOCKED);
    expect(en.aiAssistant.subtitle).toBe(LOCKED);
  });

  it("does not invent alternate taglines in Mate surfaces", () => {
    const chat = readFileSync(
      resolve(process.cwd(), "src/components/ai-dashboard/AiChatPanel.tsx"),
      "utf8"
    );
    const dash = readFileSync(
      resolve(process.cwd(), "src/components/ai-dashboard/AiProcurementDashboard.tsx"),
      "utf8"
    );
    const prompt = readFileSync(
      resolve(process.cwd(), "src/components/kokonutui/ai-prompt.tsx"),
      "utf8"
    );
    expect(chat).toMatch("mateTitle");
    expect(chat).toMatch("MATE_TAGLINE");
    expect(dash).toMatch("mateTitle");
    expect(dash).not.toMatch("mateSubtitle");
    expect(prompt).toMatch("MATE_TAGLINE");
    expect(chat).not.toMatch("Scout finds mills, Compare lines up offers");
  });

  it("uses a Bot AI-worker mark (not Sparkles) on the Mate welcome hero", () => {
    const chat = readFileSync(
      resolve(process.cwd(), "src/components/ai-dashboard/AiChatPanel.tsx"),
      "utf8"
    );
    expect(chat).toMatch(/\bBot\b/);
    expect(chat).toMatch(/<Bot /);
    expect(chat).not.toMatch(/Sparkles/);
  });
});
