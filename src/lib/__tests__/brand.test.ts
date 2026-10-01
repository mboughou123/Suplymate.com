import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_ABOUT_BANNER, SITE_MASCOT } from "@/lib/brand";

const ROOT = process.cwd();

function sha256(rel: string): string {
  return createHash("sha256").update(readFileSync(resolve(ROOT, rel))).digest("hex");
}

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkSourceFiles(full, acc);
      continue;
    }
    if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(name))) acc.push(full);
  }
  return acc;
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
      expect(existsSync(resolve(ROOT, file)), file).toBe(true);
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

  it("keeps every nav/shell/footer lockup wordmark-only (no mascot)", () => {
    const lockups = [
      "src/components/Navbar.tsx",
      "src/components/home/HomeTopNav.tsx",
      "src/components/Footer.tsx",
      "src/components/dashboard/DashboardSidebar.tsx",
      "src/components/dashboard/DashboardTopbar.tsx",
      "src/components/dashboard/DashboardShell.tsx",
      "src/components/ai-workspace/WorkspaceTopBar.tsx",
      "src/components/supplier/SupplierShell.tsx",
      "src/components/AuthFormLayout.tsx",
    ];
    for (const file of lockups) {
      const src = readFileSync(resolve(ROOT, file), "utf8");
      expect(src, file).not.toContain("SiteLogoMark");
      expect(src, file).not.toContain("SITE_MASCOT");
      expect(src, file).not.toContain("suplymate-mascot");
    }

    const navbar = readFileSync(resolve(ROOT, "src/components/Navbar.tsx"), "utf8");
    const homeNav = readFileSync(resolve(ROOT, "src/components/home/HomeTopNav.tsx"), "utf8");
    expect(navbar).toContain('brandSuply');
    expect(navbar).toContain("Beta");
    expect(homeNav).toContain('brandSuply');
    expect(homeNav).toContain("Beta");
  });

  it("hides the language switcher from headers and shells (English-only UI)", () => {
    const chrome = [
      "src/components/Navbar.tsx",
      "src/components/home/HomeTopNav.tsx",
      "src/components/Footer.tsx",
      "src/components/dashboard/DashboardSidebar.tsx",
      "src/components/dashboard/DashboardTopbar.tsx",
      "src/components/dashboard/DashboardShell.tsx",
      "src/components/ai-workspace/WorkspaceTopBar.tsx",
      "src/components/supplier/SupplierShell.tsx",
      "src/components/AuthFormLayout.tsx",
    ];
    for (const file of chrome) {
      const src = readFileSync(resolve(ROOT, file), "utf8");
      expect(src, file).not.toContain("LanguageSelector");
    }
    const selector = readFileSync(resolve(ROOT, "src/components/LanguageSelector.tsx"), "utf8");
    expect(selector).toContain("return null");
  });

  it("does not render the mascot anywhere in app UI", () => {
    const allowed = new Set([
      relative(ROOT, resolve(ROOT, "src/lib/brand.ts")),
      relative(ROOT, resolve(ROOT, "src/lib/__tests__/brand.test.ts")),
    ]);
    const offenders: string[] = [];
    for (const file of walkSourceFiles(resolve(ROOT, "src"))) {
      const rel = relative(ROOT, file);
      if (allowed.has(rel)) continue;
      const src = readFileSync(file, "utf8");
      if (src.includes("SiteLogoMark") || src.includes("SITE_MASCOT") || src.includes("suplymate-mascot")) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
    expect(existsSync(resolve(ROOT, "src/components/SiteLogoMark.tsx"))).toBe(false);
  });

  it("places the wide banner on the About page", () => {
    const about = readFileSync(resolve(ROOT, "src/app/[locale]/about/page.tsx"), "utf8");
    expect(about).toContain("SITE_ABOUT_BANNER");
    expect(about).not.toContain("SITE_MASCOT");
    expect(about).not.toContain("SiteLogoMark");
  });
});
