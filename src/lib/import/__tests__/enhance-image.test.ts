import { afterEach, describe, expect, it, vi } from "vitest";
import { enhanceImage, enhancerStatus, ENHANCE_PROMPT, OPENAI_IMAGE_EDIT_MODEL } from "@/lib/import/enhance-image";

// Minimal valid JPEG header so MIME sniffing / size checks pass.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00]);

function imageResponse(buf: Buffer = JPEG, type = "image/jpeg"): Response {
  return new Response(new Uint8Array(buf), { status: 200, headers: { "Content-Type": type, "Content-Length": String(buf.byteLength) } });
}
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("enhancerStatus", () => {
  it("is a no-op by default and never enables OpenAI without the opt-in flag", () => {
    vi.stubEnv("IMAGE_ENHANCER_URL", "");
    vi.stubEnv("IMAGE_ENHANCE_WITH_OPENAI", "");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    expect(enhancerStatus()).toMatchObject({ provider: "none", configured: false });
  });

  it("prefers the webhook, then OpenAI only when explicitly enabled", () => {
    vi.stubEnv("IMAGE_ENHANCER_URL", "https://enhancer.example/v1/enhance");
    expect(enhancerStatus()).toMatchObject({ provider: "webhook", configured: true });

    vi.stubEnv("IMAGE_ENHANCER_URL", "");
    vi.stubEnv("IMAGE_ENHANCE_WITH_OPENAI", "true");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    expect(enhancerStatus()).toMatchObject({ provider: "openai", configured: true });

    vi.stubEnv("OPENAI_API_KEY", "");
    expect(enhancerStatus()).toMatchObject({ provider: "none", configured: false });
  });

  it("rejects private webhook hosts", () => {
    vi.stubEnv("IMAGE_ENHANCER_URL", "http://169.254.169.254/enhance");
    expect(enhancerStatus()).toMatchObject({ provider: "none", configured: false });
  });
});

describe("enhanceImage", () => {
  it("returns the original when nothing is configured and never enhances logos", async () => {
    vi.stubEnv("IMAGE_ENHANCER_URL", "");
    vi.stubEnv("IMAGE_ENHANCE_WITH_OPENAI", "");
    const res = await enhanceImage({ imageUrl: "https://a.example/x.jpg" });
    expect(res.enhanced).toBe(false);
    expect(res.provider).toBe("none");

    vi.stubEnv("IMAGE_ENHANCER_URL", "https://enhancer.example/enhance");
    const logo = await enhanceImage({ imageUrl: "https://a.example/logo.png", kind: "logo" });
    expect(logo).toMatchObject({ enhanced: false, reason: "logos are never enhanced" });
  });

  it("POSTs the documented contract to the webhook and downloads the returned url", async () => {
    vi.stubEnv("IMAGE_ENHANCER_URL", "https://enhancer.example/enhance");
    vi.stubEnv("IMAGE_ENHANCER_KEY", "enh-secret");
    const webhook = vi.fn(async () => jsonResponse({ url: "https://cdn.example/enhanced/x.jpg" }));
    // The enhanced download goes through the SSRF-safe global fetch.
    const globalFetch = vi.fn(async () => imageResponse());
    vi.stubGlobal("fetch", globalFetch);

    const res = await enhanceImage(
      { imageUrl: "https://a.example/x.jpg", kind: "certificate", entity: { type: "CERTIFICATION", id: "c1" }, requestId: "r1" },
      { fetchImpl: webhook }
    );
    expect(res.enhanced).toBe(true);
    if (res.enhanced) {
      expect(res.provider).toBe("webhook");
      expect(res.contentType).toBe("image/jpeg");
      expect(res.resultUrl).toBe("https://cdn.example/enhanced/x.jpg");
      expect(res.buffer.byteLength).toBe(JPEG.byteLength);
    }
    const [url, init] = webhook.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://enhancer.example/enhance");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer enh-secret");
    expect(JSON.parse(String(init.body))).toEqual({
      imageUrl: "https://a.example/x.jpg",
      kind: "certificate",
      entity: { type: "CERTIFICATION", id: "c1" },
      requestId: "r1",
    });
    expect(globalFetch).toHaveBeenCalledWith("https://cdn.example/enhanced/x.jpg", expect.anything());
  });

  it("accepts an inline data-url result and a skipped verdict; keeps the original on errors", async () => {
    vi.stubEnv("IMAGE_ENHANCER_URL", "https://enhancer.example/enhance");
    const inline = await enhanceImage(
      { imageUrl: "https://a.example/x.jpg" },
      { fetchImpl: vi.fn(async () => jsonResponse({ image: `data:image/png;base64,${Buffer.from("png-bytes").toString("base64")}` })) }
    );
    expect(inline).toMatchObject({ enhanced: true, provider: "webhook", contentType: "image/png" });

    const skipped = await enhanceImage(
      { imageUrl: "https://a.example/x.jpg" },
      { fetchImpl: vi.fn(async () => jsonResponse({ skipped: true, reason: "already sharp" })) }
    );
    expect(skipped).toMatchObject({ enhanced: false, provider: "webhook", reason: "already sharp" });

    const failed = await enhanceImage({ imageUrl: "https://a.example/x.jpg" }, { fetchImpl: vi.fn(async () => jsonResponse({}, 502)) });
    expect(failed).toMatchObject({ enhanced: false, reason: "enhancer HTTP 502" });

    const thrown = await enhanceImage(
      { imageUrl: "https://a.example/x.jpg" },
      {
        fetchImpl: vi.fn(async () => {
          throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
        }),
      }
    );
    expect(thrown).toMatchObject({ enhanced: false, reason: "enhancer timeout" });
  });

  it("uses OpenAI gpt-image-1 edits with the conservative prompt when opted in", async () => {
    vi.stubEnv("IMAGE_ENHANCER_URL", "");
    vi.stubEnv("IMAGE_ENHANCE_WITH_OPENAI", "true");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-openai");
    const openai = vi.fn(async () => jsonResponse({ data: [{ b64_json: Buffer.from("enhanced-png").toString("base64") }] }));

    const res = await enhanceImage({ imageUrl: "https://a.example/x.jpg", buffer: JPEG, contentType: "image/jpeg" }, { fetchImpl: openai });
    expect(res).toMatchObject({ enhanced: true, provider: "openai", contentType: "image/png" });

    const [url, init] = openai.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/images/edits");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test-openai");
    const form = init.body as FormData;
    expect(form.get("model")).toBe(OPENAI_IMAGE_EDIT_MODEL);
    expect(form.get("prompt")).toBe(ENHANCE_PROMPT);
    expect(ENHANCE_PROMPT).toMatch(/Do NOT add, remove, move or invent/);
    expect(form.get("image")).toBeInstanceOf(Blob);
  });
});
