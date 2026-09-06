import { afterEach, describe, expect, it, vi } from "vitest";
import {
  xaiChat,
  xaiJson,
  parseJsonObject,
  isXaiConfigured,
  xaiModel,
  xaiVisionModel,
  DEFAULT_XAI_MODEL,
  redactXaiSecrets,
} from "@/lib/xai";
import {
  curateSupplierPhotos,
  generateProductDescription,
  summarizeSupplier,
  heuristicPhotoKind,
} from "@/lib/import/grok-curation";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function completion(content: string, model = "grok-4.6") {
  return jsonResponse({ model, choices: [{ message: { role: "assistant", content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("xai client", () => {
  it("is optional: reports not configured and skips without a key", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    expect(isXaiConfigured()).toBe(false);
    const res = await xaiChat({ messages: [{ role: "user", content: "hi" }] });
    expect(res).toEqual({ ok: false, error: "XAI_API_KEY not configured" });
  });

  it("uses grok-4.6 by default and honours XAI_MODEL / XAI_VISION_MODEL", () => {
    vi.stubEnv("XAI_MODEL", "");
    vi.stubEnv("XAI_VISION_MODEL", "");
    expect(xaiModel()).toBe(DEFAULT_XAI_MODEL);
    expect(xaiVisionModel()).toBe(DEFAULT_XAI_MODEL);
    vi.stubEnv("XAI_MODEL", "grok-5");
    expect(xaiModel()).toBe("grok-5");
    expect(xaiVisionModel()).toBe("grok-5");
    vi.stubEnv("XAI_VISION_MODEL", "grok-5-vision");
    expect(xaiVisionModel()).toBe("grok-5-vision");
  });

  it("calls the OpenAI-compatible endpoint with the bearer key and model", async () => {
    vi.stubEnv("XAI_API_KEY", "xai-test-key-123456");
    vi.stubEnv("XAI_MODEL", "grok-4.6");
    const fetchImpl = vi.fn(async () => completion("hello from grok"));
    const res = await xaiChat({ messages: [{ role: "user", content: "hi" }], fetchImpl, json: true });
    expect(res).toMatchObject({ ok: true, content: "hello from grok", model: "grok-4.6" });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer xai-test-key-123456");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("grok-4.6");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content).toBe("hi");
  });

  it("surfaces HTTP errors without leaking the key", async () => {
    vi.stubEnv("XAI_API_KEY", "xai-SECRETSECRET");
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "Incorrect API key xai-SECRETSECRET", code: "invalid_api_key" } }, 401));
    const res = await xaiChat({ messages: [{ role: "user", content: "hi" }], fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(401);
      expect(res.error).toMatch(/401 invalid or missing API key/);
      expect(res.error).not.toContain("SECRETSECRET");
    }
    expect(redactXaiSecrets("Bearer abcdefghijkl and xai-abcdef")).toBe("Bearer *** and xai-***");
  });

  it("parses fenced / prefixed JSON replies", () => {
    expect(parseJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonObject('Sure! {"a":{"b":2}} trailing')).toEqual({ a: { b: 2 } });
    expect(parseJsonObject("nope")).toBeNull();
  });

  it("xaiJson returns the parsed object", async () => {
    vi.stubEnv("XAI_API_KEY", "xai-test");
    const fetchImpl = vi.fn(async () => completion('{"summary":"ok"}'));
    const res = await xaiJson<{ summary: string }>({ messages: [{ role: "user", content: "x" }], fetchImpl });
    expect(res).toMatchObject({ ok: true, data: { summary: "ok" } });
  });
});

describe("grok curation", () => {
  const urls = [
    "https://mill.example/plant-aerial.jpg",
    "https://mill.example/wp-content/uploads/logo.png",
    "https://mill.example/certs/iso-9001.jpg",
    "https://mill.example/stock-people.jpg",
    "https://mill.example/line.jpg",
  ];

  it("falls back to URL heuristics when Grok is not configured", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    expect(heuristicPhotoKind("https://x/logo.png")).toBe("logo");
    expect(heuristicPhotoKind("https://x/certs/iso-9001.jpg")).toBe("certificate");
    expect(heuristicPhotoKind("https://x/plant.jpg")).toBe("product");

    const res = await curateSupplierPhotos(urls, { supplierName: "Mill" }, { keep: 2 });
    expect(res.source).toBe("heuristic");
    const byUrl = Object.fromEntries(res.photos.map((p) => [p.url, p]));
    expect(byUrl[urls[1]].kind).toBe("logo");
    expect(byUrl[urls[1]].keep).toBe(false);
    expect(byUrl[urls[2]].kind).toBe("certificate");
    expect(byUrl[urls[2]].keep).toBe(true);
    // keep=2 non-certificate photos
    expect(res.photos.filter((p) => p.keep && p.kind !== "certificate")).toHaveLength(2);
  });

  it("uses the vision model to classify, keeps the best N, routes certificates and drops logos", async () => {
    vi.stubEnv("XAI_API_KEY", "xai-test");
    vi.stubEnv("XAI_VISION_MODEL", "grok-4.6");
    const fetchImpl = vi.fn(async () =>
      completion(
        JSON.stringify({
          photos: [
            { index: 0, kind: "factory_exterior", quality: 5, note: "aerial of the plant" },
            { index: 1, kind: "logo", quality: 4 },
            { index: 2, kind: "certificate", quality: 4 },
            { index: 3, kind: "irrelevant", quality: 3, note: "stock people" },
            { index: 4, kind: "production_line", quality: 2 },
          ],
        })
      )
    );
    const res = await curateSupplierPhotos(urls, { supplierName: "Mill", category: "Steel & Metals" }, { keep: 1, fetchImpl });
    expect(res.source).toBe("grok");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.model).toBe("grok-4.6");
    const parts = body.messages[1].content as { type: string; image_url?: { url: string } }[];
    expect(parts.filter((p) => p.type === "image_url").map((p) => p.image_url!.url)).toEqual(urls);

    const byUrl = Object.fromEntries(res.photos.map((p) => [p.url, p]));
    expect(byUrl[urls[0]]).toMatchObject({ kind: "factory_exterior", quality: 5, keep: true });
    expect(byUrl[urls[1]]).toMatchObject({ kind: "logo", keep: false });
    expect(byUrl[urls[2]]).toMatchObject({ kind: "certificate", keep: true });
    expect(byUrl[urls[3]]).toMatchObject({ kind: "irrelevant", keep: false });
    // keep=1 → the lower-quality production line shot is dropped
    expect(byUrl[urls[4]]).toMatchObject({ kind: "production_line", keep: false });
  });

  it("degrades to heuristics when the Grok call fails", async () => {
    vi.stubEnv("XAI_API_KEY", "xai-test");
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "boom" }, 500));
    const res = await curateSupplierPhotos(urls.slice(0, 2), { supplierName: "Mill" }, { fetchImpl });
    expect(res.source).toBe("heuristic");
    expect(res.note).toMatch(/Grok curation failed/);
  });

  it("generates product copy from facts only and skips without a key", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    const skipped = await generateProductDescription({ name: "HRC", supplierName: "POSCO" });
    expect(skipped.ok).toBe(false);

    vi.stubEnv("XAI_API_KEY", "xai-test");
    const fetchImpl = vi.fn(async () =>
      completion(JSON.stringify({ description: "Hot-rolled coil for structural use.", specs: ["Thickness 1.2–25 mm", "", "Width up to 2,000 mm"] }))
    );
    const res = await generateProductDescription(
      { name: "Hot-Rolled Coil", supplierName: "POSCO", category: "Steel & Metals", attributes: { thickness: "1.2–25 mm" } },
      { fetchImpl }
    );
    expect(res).toMatchObject({ ok: true, description: "Hot-rolled coil for structural use.", specs: ["Thickness 1.2–25 mm", "Width up to 2,000 mm"] });
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.messages[0].content).toMatch(/never invent or infer certifications, standards, prices/i);
    expect(JSON.parse(body.messages[1].content)).toMatchObject({ product_name: "Hot-Rolled Coil", attributes: { thickness: "1.2–25 mm" } });
  });

  it("summarises a supplier from facts only", async () => {
    vi.stubEnv("XAI_API_KEY", "xai-test");
    const fetchImpl = vi.fn(async () => completion(JSON.stringify({ summary: "POSCO is a steel producer based in Pohang, South Korea." })));
    const res = await summarizeSupplier({ name: "POSCO", country: "South Korea", city: "Pohang" }, { fetchImpl });
    expect(res).toMatchObject({ ok: true, summary: "POSCO is a steel producer based in Pohang, South Korea." });
  });
});
