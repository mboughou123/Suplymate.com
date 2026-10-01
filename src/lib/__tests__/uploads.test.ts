// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizePhoto } from "@/lib/uploads";
import { isUploadedImagePath, uploadedImagePath } from "@/lib/upload-paths";

async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#336699" } }).jpeg().toBuffer();
}

describe("normalizePhoto", () => {
  it("shrinks large gallery photos to 1600px and encodes WebP", async () => {
    const out = await normalizePhoto(await jpeg(4000, 3000), "gallery");
    expect(out.width).toBe(1600);
    expect(out.height).toBe(1200);
    expect((await sharp(out.buffer).metadata()).format).toBe("webp");
  });

  it("caps logos at 512px and never enlarges small images", async () => {
    expect((await normalizePhoto(await jpeg(2000, 1000), "logo")).width).toBe(512);
    expect((await normalizePhoto(await jpeg(300, 200), "cover")).width).toBe(300);
  });

  it("rejects files that are not images", async () => {
    await expect(normalizePhoto(Buffer.from("not an image"), "gallery")).rejects.toThrow();
  });
});

describe("uploaded image paths", () => {
  it("round-trips ids and rejects other paths", () => {
    expect(isUploadedImagePath(uploadedImagePath("clx123abc"))).toBe(true);
    expect(isUploadedImagePath("/api/uploads/../secret")).toBe(false);
    expect(isUploadedImagePath("https://evil.example/api/uploads/x")).toBe(false);
  });
});
