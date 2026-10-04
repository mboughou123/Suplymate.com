// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { DOC_MAX_PX, LOGO_MAX_PX, PHOTO_MAX_PX, enhanceForRole, isSvg } from "../enhance";

async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 130, b: 140 } } }).jpeg().toBuffer();
}

async function logoOnWhite(): Promise<Buffer> {
  const mark = await sharp({ create: { width: 300, height: 100, channels: 3, background: { r: 10, g: 40, b: 90 } } }).png().toBuffer();
  return sharp({ create: { width: 900, height: 600, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([{ input: mark, left: 300, top: 250 }])
    .png()
    .toBuffer();
}

describe("enhanceForRole", () => {
  it("trims, fits and squares logos as transparent PNG", async () => {
    const out = await enhanceForRole(await logoOnWhite(), "logo");
    expect(out).toMatchObject({ ext: "png", mimeType: "image/png", enhancement: "resize" });
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBe(meta.height);
    expect(meta.width).toBeLessThanOrEqual(LOGO_MAX_PX);
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBe(300);
  });

  it("passes SVG logos through untouched", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    expect(isSvg(svg)).toBe(true);
    const out = await enhanceForRole(svg, "logo");
    expect(out).toMatchObject({ ext: "svg", enhancement: "none" });
    expect(out.buffer.equals(svg)).toBe(true);
  });

  it("only downsizes certificates, and leaves normal-size scans byte-identical", async () => {
    const small = await jpeg(1200, 1600);
    const same = await enhanceForRole(small, "certificate");
    expect(same.enhancement).toBe("none");
    expect(same.buffer.equals(small)).toBe(true);

    const big = await enhanceForRole(await jpeg(3000, 4200), "certificate");
    expect(big.enhancement).toBe("resize");
    expect(Math.max(big.width!, big.height!)).toBe(DOC_MAX_PX);
  });

  it("keeps product photos as they are unless they need resizing", async () => {
    const normal = await jpeg(1200, 900);
    expect((await enhanceForRole(normal, "product")).buffer.equals(normal)).toBe(true);
    const tiny = await enhanceForRole(await jpeg(400, 300), "product");
    expect(tiny).toMatchObject({ enhancement: "upscale", width: 800, height: 600 });
    const huge = await enhanceForRole(await jpeg(4000, 3000), "product");
    expect(huge).toMatchObject({ enhancement: "resize", width: PHOTO_MAX_PX });
  });

  it("restores facility photos", async () => {
    const out = await enhanceForRole(await jpeg(1600, 1200), "factory");
    expect(out).toMatchObject({ enhancement: "restore", ext: "jpg", width: 1600, height: 1200 });
  });

  it("throws on bytes that are not an image", async () => {
    await expect(enhanceForRole(Buffer.from("not an image"), "gallery")).rejects.toThrow();
  });
});
