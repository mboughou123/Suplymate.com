// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { FileAiCache } from "../ai-cache";
import { localAiConfig, localAiStatus, parseQaVerdict, reviewImage } from "../local-ai";

const config = { baseUrl: "http://ollama:11434/v1", model: "llama3.2-vision" };
const reply = (content: string) =>
  new Response(JSON.stringify({ model: "llama3.2-vision", choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });

describe("localAiConfig", () => {
  it("defaults to a local Ollama", () => {
    expect(localAiConfig({})).toEqual({ baseUrl: "http://localhost:11434/v1", model: "llama3.2-vision" });
    expect(localAiConfig({ LOCAL_AI_BASE_URL: "http://ollama:11434/v1/", LOCAL_AI_VISION_MODEL: "qwen2.5vl:7b" })).toEqual({ baseUrl: "http://ollama:11434/v1", model: "qwen2.5vl:7b" });
  });
});

describe("reviewImage", () => {
  it("sends the image as a data URL with no API key, then serves the verdict from cache", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => reply('{"matchesRole": true, "quality": 4, "marketplaceWatermark": false, "notes": "clear plant photo"}'));
    const cache = new FileAiCache(null);
    const input = { buffer: Buffer.from([1, 2, 3]), mimeType: "image/jpeg", sha256: "a".repeat(64), role: "factory" as const, entityName: "POSCO", config, cache, fetchImpl: fetchImpl as unknown as typeof fetch };

    const first = await reviewImage(input);
    expect(first).toEqual({ ok: true, cached: false, qa: { model: "llama3.2-vision", quality: 4, matchesRole: true, marketplaceWatermark: false, notes: "clear plant photo" } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://ollama:11434/v1/chat/completions");
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined();
    const body = JSON.parse(String(init!.body));
    expect(body.model).toBe("llama3.2-vision");
    expect(body.messages[1].content[1].image_url.url).toBe("data:image/jpeg;base64,AQID");

    const second = await reviewImage(input);
    expect(second).toMatchObject({ ok: true, cached: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports unusable replies and unreachable servers instead of throwing", async () => {
    const cache = new FileAiCache(null);
    const base = { buffer: Buffer.from([1]), mimeType: "image/png", sha256: "b".repeat(64), role: "logo" as const, entityName: "X", config, cache };
    expect(await reviewImage({ ...base, fetchImpl: (async () => reply("I think it is a logo")) as typeof fetch })).toEqual({ ok: false, error: "local AI reply was not a valid verdict" });
    const down = await reviewImage({ ...base, fetchImpl: (async () => { throw new TypeError("fetch failed"); }) as typeof fetch });
    expect(down).toEqual({ ok: false, error: "Local AI request failed (network error)" });
  });

  it("skips vector logos", async () => {
    const res = await reviewImage({ buffer: Buffer.from("<svg/>"), mimeType: "image/svg+xml", sha256: "c".repeat(64), role: "logo", entityName: "X", config, cache: new FileAiCache(null) });
    expect(res.ok).toBe(false);
  });
});

describe("parseQaVerdict", () => {
  it("clamps quality and requires the boolean fields", () => {
    expect(parseQaVerdict({ matchesRole: true, quality: 9, marketplaceWatermark: false }, "m")).toEqual({ model: "m", quality: 5, matchesRole: true, marketplaceWatermark: false });
    expect(parseQaVerdict({ matchesRole: "yes", quality: 3, marketplaceWatermark: false }, "m")).toBeNull();
  });
});

describe("localAiStatus", () => {
  it("knows whether the model is pulled", async () => {
    const models = (ids: string[]) => (async () => new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }))) as typeof fetch;
    expect((await localAiStatus(config, models(["llama3.2-vision:latest"]))).ok).toBe(true);
    expect(await localAiStatus(config, models(["llama3.1:8b"]))).toMatchObject({ ok: false, detail: expect.stringMatching(/not pulled/) });
  });
});
