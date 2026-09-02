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
    const home = readFileSync(
      resolve(process.cwd(), "src/components/HomeAiDemoSection.tsx"),
      "utf8"
    );
    expect(home).not.toMatch("BeamsBackground");
    expect(home).not.toMatch("BackgroundPaths");
    expect(home).not.toMatch("FlowField");
  });
});
