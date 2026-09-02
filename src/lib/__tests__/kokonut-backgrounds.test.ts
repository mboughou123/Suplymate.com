import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Kokonut background adapters", () => {
  it("does not render stock Beams / Background Paths titles", () => {
    const beams = readFileSync(
      resolve(process.cwd(), "src/components/kokonutui/beams-background.tsx"),
      "utf8"
    );
    const paths = readFileSync(
      resolve(process.cwd(), "src/components/kokonutui/background-paths.tsx"),
      "utf8"
    );
    expect(beams).not.toMatch(/<h1[\s\S]*Beams/);
    expect(paths).not.toMatch(/<h1[\s\S]*Background Paths/);
    expect(beams).toMatch(/children/);
    expect(paths).toMatch(/navy|0d3349|0369a1|0ea5b7/i);
  });

  it("is not imported on the homepage marketing surface", () => {
    const files = [
      "src/app/[locale]/page.tsx",
      "src/components/HomeAiDemoSection.tsx",
      "src/components/home/HomeHero.tsx",
      "src/components/home/HomeAgentOrb.tsx",
    ];
    for (const rel of files) {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(src, rel).not.toMatch("BeamsBackground");
      expect(src, rel).not.toMatch("BackgroundPaths");
      expect(src, rel).not.toMatch("FlowField");
    }
  });
});

describe("homepage agent orb", () => {
  it("lazy-loads beside the console and strips the source debug strings", () => {
    const section = readFileSync(
      resolve(process.cwd(), "src/components/HomeAiDemoSection.tsx"),
      "utf8"
    );
    const orb = readFileSync(
      resolve(process.cwd(), "src/components/home/HomeAgentOrb.tsx"),
      "utf8"
    );
    expect(section).toMatch("next/dynamic");
    expect(section).toMatch("ssr: false");
    expect(section).toMatch("lg:grid-cols-12");
    expect(orb).not.toMatch("setInfo");
    expect(orb).not.toMatch("annotate");
    expect(orb).not.toMatch("Siri");
    expect(orb).toMatch("enableRotate={false}");
    expect(orb).toMatch("7000");
    expect(orb).toMatch("14000");
  });
});
