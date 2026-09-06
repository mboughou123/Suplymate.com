import { afterEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { describeOpenAiError, logOpenAiError, openAiModel, DEFAULT_OPENAI_MODEL } from "@/lib/openai";
import { parseRequirement } from "@/lib/ai/requirement-parser";

function apiError(status: number, code: string, message: string) {
  return new OpenAI.APIError(status, { code, type: "invalid_request_error", message }, message, new Headers());
}

describe("OpenAI error reporting", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses gpt-4o-mini unless OPENAI_MODEL overrides it", () => {
    vi.stubEnv("OPENAI_MODEL", "");
    expect(openAiModel()).toBe(DEFAULT_OPENAI_MODEL);
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-4o-mini");
    vi.stubEnv("OPENAI_MODEL", "gpt-4.1");
    expect(openAiModel()).toBe("gpt-4.1");
  });

  it("summarises status + code for common misconfigurations", () => {
    expect(describeOpenAiError(apiError(401, "invalid_api_key", "Incorrect API key provided: sk-abc123"))).toBe(
      "OpenAI request failed (401 invalid_api_key: invalid or missing API key)",
    );
    expect(describeOpenAiError(apiError(429, "insufficient_quota", "You exceeded your current quota"))).toMatch(
      /429 insufficient_quota: quota exceeded/,
    );
    expect(describeOpenAiError(apiError(429, "rate_limit_exceeded", "Rate limit reached"))).toMatch(/429 rate_limit_exceeded: rate limited/);
    expect(describeOpenAiError(apiError(404, "model_not_found", "The model does not exist"))).toMatch(/404 model_not_found: model "gpt-4o-mini" not found/);
    expect(describeOpenAiError(new Error("OPENAI_API_KEY not configured"))).toBe("OpenAI key missing");
  });

  it("never leaks an API key into the description or the log line", () => {
    const err = new Error("Request failed for key sk-proj-SECRETSECRETSECRET");
    expect(describeOpenAiError(err)).not.toContain("SECRET");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logOpenAiError("test", apiError(401, "invalid_api_key", "Incorrect API key provided: sk-proj-SECRETSECRETSECRET"));
    const line = spy.mock.calls[0]?.[0] as string;
    expect(line).toContain("[openai:test]");
    expect(line).toContain("status=401");
    expect(line).toContain("code=invalid_api_key");
    expect(line).not.toContain("SECRET");
  });
});

describe("requirement parser locations", () => {
  it("accepts an article before the place name", () => {
    expect(parseRequirement("Find aluminum suppliers in the UAE").location).toBe("UAE");
    expect(parseRequirement("Ship 5 tons of copper to the Netherlands").location).toBe("Netherlands");
    expect(parseRequirement("Find aluminum suppliers in California.").location).toBe("California");
  });
});
