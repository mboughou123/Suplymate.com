import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_ABOUT_BANNER, SITE_MASCOT } from "@/lib/brand";

function sha256(rel: string): string {
  return createHash("sha256").update(readFileSync(resolve(process.cwd(), rel))).digest("hex");
}

describe("site brand assets", () => {
  it("ships the About banner and App Router icons without the mascot as favicon", () => {
    const files = [
      "public/brand/suplymate-about-banner.png",
      "src/app/icon.png",
      "src/app/apple-icon.png",
      "src/app/favicon.ico",
    ];
    for (const file of files) {
      expect(existsSync(resolve(process.cwd(), file)), file).toBe(true);
    }
    const mascotHash = sha256("public/brand/suplymate-mascot.png");
    expect(sha256("src/app/icon.png")).not.toBe(mascotHash);
    expect(sha256("src/app/apple-icon.png")).not.toBe(mascotHash);
  });

  it("points public URLs at the committed brand files", () => {
    expect(SITE_MASCOT.src).toBe("/brand/suplymate-mascot.png");
    expect(SITE_ABOUT_BANNER.src).toBe("/brand/suplymate-about-banner.png");
    expect(SITE_ABOUT_BANNER.width).toBeGreaterThan(SITE_ABOUT_BANNER.height);
  });

  it("keeps the header wordmark-only and uses the mascot in the footer", () => {
    const navbar = readFileSync(resolve(process.cwd(), "src/components/Navbar.tsx"), "utf8");
    const homeNav = readFileSync(resolve(process.cwd(), "src/components/home/HomeTopNav.tsx"), "utf8");
    const footer = readFileSync(resolve(process.cwd(), "src/components/Footer.tsx"), "utf8");
    expect(navbar).not.toContain("SiteLogoMark");
    expect(homeNav).not.toContain("SiteLogoMark");
    expect(footer).toContain("SiteLogoMark");
  });

  it("places the wide banner on the About page", () => {
    const about = readFileSync(resolve(process.cwd(), "src/app/[locale]/about/page.tsx"), "utf8");
    expect(about).toContain("SITE_ABOUT_BANNER");
  });
});
