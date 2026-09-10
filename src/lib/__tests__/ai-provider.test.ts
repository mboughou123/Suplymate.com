import { afterEach, describe, expect, it, vi } from "vitest";

describe("resolveAiProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("prefers XAI_API_KEY for grok", async () => {
    vi.stubEnv("XAI_API_KEY", "xai-test");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const { resolveAiProvider, isAiConfigured } = await import("@/lib/openai");
    expect(resolveAiProvider()).toBe("grok");
    expect(isAiConfigured()).toBe(true);
  });

  it("accepts GROK_API_KEY alias", async () => {
    vi.stubEnv("GROK_API_KEY", "grok-test");
    const { resolveAiProvider } = await import("@/lib/openai");
    expect(resolveAiProvider()).toBe("grok");
  });

  it("falls back to openai when only OPENAI_API_KEY is set", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const { resolveAiProvider } = await import("@/lib/openai");
    expect(resolveAiProvider()).toBe("openai");
  });

  it("returns demo when no keys are set", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    vi.stubEnv("GROK_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    const { resolveAiProvider, isAiConfigured } = await import("@/lib/openai");
    expect(resolveAiProvider()).toBe("demo");
    expect(isAiConfigured()).toBe(false);
  });
});
