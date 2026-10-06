import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { plan: string; email: string; used: number } = { plan: "free", email: "buyer@example.com", used: 0 };

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "u1", email: state.email } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: async () => ({ plan: state.plan, email: state.email }) },
    aiMessage: { count: async () => state.used },
  },
}));

vi.mock("@/lib/ai/conversation-store", () => ({
  ensureConversation: async () => "thread-1",
  persistTurn: async () => {},
  loadLatestConversation: async () => ({ conversationId: null, messages: [] }),
}));

vi.mock("@/lib/ai/aiService", () => ({
  MAX_MESSAGE_LENGTH: 2000,
  MAX_HISTORY_MESSAGES: 12,
  engineStatus: () => ({ engine: "demo", model: null, engineNote: "test", lastFailureAt: null }),
  runAssistant: async () => ({
    reply: "ok",
    source: "demo",
    engineNote: "test",
    state: "working",
    stage: "requirement",
    requirement: { intent: "general", materials: [], industries: [], quantity: null, location: null, beginner: false },
    blocks: [],
  }),
}));

vi.mock("@/lib/pricing/pricingService", () => ({
  pricingStatus: () => ({ provider: null, configured: false }),
}));

import { POST } from "@/app/api/ai/route";
import { quotaFrom, startOfUtcMonth } from "@/lib/ai/ai-quota";

function ask() {
  return POST(
    new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Find steel suppliers" }),
    }),
  );
}

describe("monthly AI question quota", () => {
  beforeEach(() => {
    state.plan = "free";
    state.email = `buyer-${Math.random()}@example.com`;
    state.used = 0;
  });

  it("counts from the first of the UTC month", () => {
    expect(startOfUtcMonth(new Date("2026-10-17T13:00:00Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(quotaFrom(5, 7)).toEqual({ limit: 5, used: 7, remaining: 0 });
    expect(quotaFrom(null, 7).remaining).toBeNull();
  });

  it("answers Free users until their 5 questions are used", async () => {
    state.used = 4;
    const ok = await ask();
    expect(ok.status).toBe(200);
    expect((await ok.json()).aiQuota).toEqual({ limit: 5, used: 5, remaining: 0 });

    state.used = 5;
    const blocked = await ask();
    expect(blocked.status).toBe(403);
    expect((await blocked.json()).code).toBe("ai_quota");
  });

  it("allows Basic 20 questions a month", async () => {
    state.plan = "basic";
    state.used = 19;
    expect((await ask()).status).toBe(200);
    state.used = 20;
    expect((await ask()).status).toBe(403);
  });

  it("never limits Pro or the owner account", async () => {
    state.plan = "premium";
    state.used = 500;
    expect((await ask()).status).toBe(200);
    state.plan = "free";
    state.email = "info@suplymate.com";
    expect((await ask()).status).toBe(200);
  });
});
