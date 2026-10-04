// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCAL_AI_VISION_MODEL } from "../worker/local-ai";

const ROOT = resolve(__dirname, "../../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const workerPkg = JSON.parse(read("deploy/media-bot/package.json")) as { dependencies: Record<string, string> };
const lock = JSON.parse(read("package-lock.json")) as { packages: Record<string, { version?: string }> };

/** Bare package names reachable at runtime from the worker entrypoint (type-only imports are erased). */
function runtimePackages(entry: string): Set<string> {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const resolveLocal = (from: string, spec: string): string | null => {
    const base = spec.startsWith("@/") ? join(ROOT, "src", spec.slice(2)) : resolve(dirname(from), spec);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
  };
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    const specs = [
      ...src.matchAll(/^\s*(?:import|export)\s+(?!type\s)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm),
      ...src.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
    ].map((m) => m[1]);
    for (const spec of specs) {
      if (spec.startsWith("node:")) continue;
      if (spec.startsWith(".") || spec.startsWith("@/")) {
        const next = resolveLocal(file, spec);
        if (!next) throw new Error(`${file}: cannot resolve ${spec}`);
        visit(next);
        continue;
      }
      packages.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
    }
  };
  visit(join(ROOT, entry));
  return packages;
}

describe("media bot worker image", () => {
  it("pins the same versions as the app lockfile", () => {
    for (const [name, version] of Object.entries(workerPkg.dependencies)) {
      expect(lock.packages[`node_modules/${name}`]?.version, name).toBe(version);
    }
  });

  it("installs every package the worker imports at runtime", () => {
    const used = [...runtimePackages("scripts/media-bot.ts")].sort();
    const installed = Object.keys(workerPkg.dependencies);
    expect(used.filter((p) => !installed.includes(p))).toEqual([]);
  });

  it("copies the files the entrypoint needs", () => {
    const dockerfile = read("deploy/media-bot/Dockerfile");
    for (const [, src] of dockerfile.matchAll(/^COPY\s+(\S+)\s+\S+$/gm)) expect(existsSync(join(ROOT, src)), src).toBe(true);
    expect(dockerfile).toContain('"scripts/media-bot.ts"');
  });
});

describe("media bot deployment config", () => {
  it("lists every Kubernetes manifest in the kustomization", () => {
    const dir = "deploy/k8s/media-bot";
    const resources = [...read(`${dir}/kustomization.yaml`).matchAll(/^\s+-\s+(\S+\.yaml)$/gm)].map((m) => m[1]).sort();
    const files = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".yaml") && f !== "kustomization.yaml").sort();
    expect(resources).toEqual(files);
  });

  it("uses the worker's default vision model everywhere", () => {
    expect(read("deploy/k8s/media-bot/configmap.yaml")).toContain(`LOCAL_AI_VISION_MODEL: ${DEFAULT_LOCAL_AI_VISION_MODEL}\n`);
    expect(read("deploy/media-bot/.env.example")).toContain(`LOCAL_AI_VISION_MODEL=${DEFAULT_LOCAL_AI_VISION_MODEL}\n`);
    const compose = read("deploy/media-bot/docker-compose.yml");
    const defaults = [...compose.matchAll(/\$\{LOCAL_AI_VISION_MODEL:-([^}]+)\}/g)].map((m) => m[1]);
    expect(defaults.length).toBeGreaterThan(0);
    expect(new Set(defaults)).toEqual(new Set([DEFAULT_LOCAL_AI_VISION_MODEL]));
  });

  it("keeps the AI cache on its own database, never the app's DATABASE_URL", () => {
    for (const file of ["deploy/media-bot/docker-compose.yml", "deploy/k8s/media-bot/cronjob.yaml", "deploy/k8s/media-bot/configmap.yaml"]) {
      expect(read(file), file).not.toMatch(/\bDATABASE_URL\b/);
    }
  });
});
