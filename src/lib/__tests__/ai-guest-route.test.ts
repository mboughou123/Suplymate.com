import { beforeEach, describe, expect, it, vi } from "vitest";
import { entitlementsFor } from "@/lib/permissions";

const authState: { userId: string | null } = { userId: null };
const planState = { entitlements: entitlementsFor("free") };

vi.mock("@/auth", () => ({
  auth: async () => (authState.userId ? { user: { id: authState.userId } } : null),
}));

vi.mock("@/lib/plan-access", () => ({
  entitlementsForUserId: async () => planState.entitlements,
  AI_QUOTA: "ai_quota",
  UPGRADE_REQUIRED: "upgrade_required",
}));

const persistTurn = vi.fn(async () => {});
const ensureConversation = vi.fn(async () => "thread-1");
vi.mock("@/lib/ai/conversation-store", () => ({
  ensureConversation: (...args: unknown[]) => ensureConversation(...(args as [])),
  persistTurn: (...args: unknown[]) => persistTurn(...(args as [])),
  loadLatestConversation: async () => ({ conversationId: null, messages: [] }),
}));

const runAssistant = vi.fn(async ({ message, mode }: { message: string; mode?: string }) => ({
  reply: `echo: ${message}`,
  source: mode === "live" ? "openai" : "demo",
  engineNote: mode === "demo" ? "demo" : "live",
  state: "working",
  stage: "requirement",
  requirement: { intent: "general", materials: [], industries: [], quantity: null, location: null, beginner: false },
  blocks: [],
}));

vi.mock("@/lib/ai/aiService", () => ({
  MAX_MESSAGE_LENGTH: 2000,
  MAX_HISTORY_MESSAGES: 12,
  engineStatus: () => ({ engine: "demo", model: null, engineNote: "test", lastFailureAt: null }),
  runAssistant: (input: unknown) => runAssistant(input as { message: string; mode?: string }),
}));

vi.mock("@/lib/pricing/pricingService", () => ({
  pricingStatus: () => ({ provider: null, configured: false }),
}));

import { GET, POST } from "@/app/api/ai/route";

function post(message: string, ip: string) {
  return POST(
    new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
      body: JSON.stringify({ message, history: [] }),
    }),
  );
}

describe("POST /api/ai guest allowance", () => {
  beforeEach(() => {
    authState.userId = null;
    planState.entitlements = entitlementsFor("free");
    persistTurn.mockClear();
    ensureConversation.mockClear();
    runAssistant.mockClear();
  });

  it("answers up to 3 demo questions per IP without a session and never persists them", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 250)}`;
    const remaining: number[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await post(`question ${i}`, ip);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.reply).toBe(`echo: question ${i}`);
      expect(body.guest).toBe(true);
      expect(body.aiMode).toBe("demo");
      expect(body.conversationId).toBeNull();
      remaining.push(body.guestRemaining);
    }
    expect(remaining).toEqual([2, 1, 0]);
    expect(ensureConversation).not.toHaveBeenCalled();
    expect(persistTurn).not.toHaveBeenCalled();
    expect(runAssistant.mock.calls[0]?.[0]).toMatchObject({ mode: "demo" });

    const blocked = await post("question 4", ip);
    expect(blocked.status).toBe(401);
    const body = await blocked.json();
    expect(body.code).toBe("guest_limit");
    expect(body.error).toMatch(/3 free questions/);

    // A different visitor is unaffected.
    const other = await post("hello", "198.51.100.7");
    expect(other.status).toBe(200);
  });

  it("runs Basic users on the demo path and caps them at 1 Mate run", async () => {
    authState.userId = `basic-${Math.random().toString(36).slice(2)}`;
    planState.entitlements = entitlementsFor("basic");
    const ip = "203.0.113.40";
    const first = await post("find pipe mills", ip);
    expect(first.status).toBe(200);
    const body = await first.json();
    expect(body.source).toBe("demo");
    expect(body.aiMode).toBe("demo");
    expect(runAssistant).toHaveBeenCalledWith(expect.objectContaining({ mode: "demo" }));

    const second = await post("another question", ip);
    expect(second.status).toBe(403);
    const blocked = await second.json();
    expect(blocked.code).toBe("ai_quota");
    expect(blocked.error).toMatch(/Basic demo Mate run/);
  });

  it("uses live Mate for subscribed Premium and allows 10 runs", async () => {
    authState.userId = `premium-${Math.random().toString(36).slice(2)}`;
    planState.entitlements = entitlementsFor("premium");
    const res = await post("find steel mills", "203.0.113.41");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("openai");
    expect(body.aiMode).toBe("live");
    expect(runAssistant).toHaveBeenCalledWith(expect.objectContaining({ mode: "live" }));
  });

  it("persists turns and skips the guest limit for signed-in users", async () => {
    authState.userId = `user-${Math.random().toString(36).slice(2)}`;
    planState.entitlements = entitlementsFor("free");
    const res = await post("hi", "203.0.113.250");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.guest).toBe(false);
    expect(body.conversationId).toBe("thread-1");
    expect(persistTurn).toHaveBeenCalledTimes(1);
  });

  it("GET works for guests", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
    expect(body.engine).toBe("demo");
    expect(body.aiMode).toBe("demo");
  });
});
