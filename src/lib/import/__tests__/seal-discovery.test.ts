// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isSealCandidatePath, parseSeal, pickSeal, sha256Hex, verifySeal } from "@/lib/import/seal-format";
import { findSeal, readDayFolder, sealCandidates } from "@/lib/import/push-client";
import { parsePushRequest } from "@/lib/import/push-request";

// Modelled on the real 2026-09-03 pack committed to the bot branch
// (data/daily-2026-09-03-*.json): the Research-QA holds there were
// `supplier_slug_guess|product_slug` keys ("ball|ball-aluminum-aerosol-cans")
// plus whole-mill holds by slug ("jiuli"), and Bossard is the soft-hold
// distributor identity that "stays out of mill-seal".
const suppliers = JSON.stringify({ suppliers: [{ company_name: "Bossard Group", slug: "bossard" }, { company_name: "POSCO", slug: "posco" }] });
const products = JSON.stringify({ products: [{ product_name: "Ball Aluminum Aerosol Cans", supplier_name: "Ball", supplier_slug_guess: "ball" }] });

const realisticSeal = {
  day: "2026-09-03",
  researcher_ok: true,
  approved_by: "Researcher",
  approved_at: "2026-09-03T17:05:00-07:00",
  sha256: { "suppliers.json": sha256Hex(suppliers), "products.json": sha256Hex(products) },
  mill_seal: ["posco", "jiuli", "thk", "hiwin"],
  soft_hold: { bossard: "distributor/logistics identity, not a producing mill" },
  qa_holds: ["ball|ball-aluminum-aerosol-cans", "jiuli"],
};

const dirs: string[] = [];
function dayFolder(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "pack-"));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("seal schema: allowlist + HOLD lists", () => {
  it("parses mill-seal allowlist and hold lists with the bot's key shapes", () => {
    const s = parseSeal(realisticSeal)!;
    expect(s.day).toBe("2026-09-03");
    expect(s.researcherOk).toBe(true);
    expect(s.sealed).toEqual(["posco", "jiuli", "thk", "hiwin"]);
    expect(s.held).toEqual([
      { key: "bossard", reason: "distributor/logistics identity, not a producing mill" },
      { key: "ball|ball-aluminum-aerosol-cans", reason: "hold" },
      { key: "jiuli", reason: "hold" },
    ]);
  });

  it("accepts camelCase / object entries and `approved` as a list", () => {
    const s = parseSeal({
      day: "2026-09-03",
      researcherOk: true,
      approved: [{ slug: "posco" }, { name: "SeAH Steel" }],
      hold: [{ supplier: "ball", product: "ball-aluminum-aerosol-cans", reason: "beverage can-tab still" }, "bossard"],
      softHold: "bossard, maharashtra-seamless",
    })!;
    expect(s.researcherOk).toBe(true);
    expect(s.sealed).toEqual(["posco", "SeAH Steel"]);
    expect(s.held.map((h) => h.key)).toEqual(["ball|ball-aluminum-aerosol-cans", "bossard", "maharashtra-seamless"]);
    expect(s.held[0].reason).toBe("beverage can-tab still");
    expect(s.held[2].reason).toBe("soft-hold");
  });

  it("without lists everything passes (empty lists, digest unchanged from the list-less form)", () => {
    const bare = parseSeal({ day: "2026-09-03", researcherOk: true, sha256: realisticSeal.sha256 })!;
    expect(bare.sealed).toEqual([]);
    expect(bare.held).toEqual([]);
    const withLists = parseSeal(realisticSeal)!;
    expect(withLists.digest).not.toBe(bare.digest);
    // Same lists in a different order → same revision.
    const reordered = parseSeal({ ...realisticSeal, mill_seal: ["hiwin", "thk", "jiuli", "posco"] })!;
    expect(reordered.digest).toBe(withLists.digest);
  });

  it("still verifies hashes with the extended schema", () => {
    expect(verifySeal(realisticSeal, { day: "2026-09-03", files: { "suppliers.json": suppliers, "products.json": products } }).ok).toBe(true);
    expect(verifySeal(realisticSeal, { day: "2026-09-03", files: { "suppliers.json": suppliers + " " } })).toMatchObject({ ok: false, reason: "sha256 mismatch for suppliers.json" });
  });
});

describe("seal discovery helpers", () => {
  it("recognises _*/ and seal-ish paths", () => {
    expect(isSealCandidatePath("_seals/2026-09-03.json")).toBe(true);
    expect(isSealCandidatePath("_qa/researcher-ok.json")).toBe(true);
    expect(isSealCandidatePath("_research/notes.json")).toBe(true);
    expect(isSealCandidatePath("seal.json")).toBe(true);
    expect(isSealCandidatePath("seals/2026-09-03.json")).toBe(true);
    expect(isSealCandidatePath("enhanced/suppliers/posco/01.jpg")).toBe(false);
    expect(isSealCandidatePath("_exclude_names.txt")).toBe(false);
    expect(isSealCandidatePath("suppliers.json")).toBe(false);
  });

  it("pickSeal prefers the candidate for the requested day", () => {
    const d2 = JSON.stringify({ day: "2026-09-02", researcherOk: true });
    const d3 = JSON.stringify({ day: "2026-09-03", researcherOk: true });
    expect(pickSeal(["garbage", d2, d3], "2026-09-03")).toBe(d3);
    expect(pickSeal([d2, d3], "2026-09-02")).toBe(d2);
    expect(pickSeal([d2, d3], "2026-09-04")).toBe(d2); // nothing for the day → first parseable
    expect(pickSeal(["nope"], "2026-09-03")).toBeNull();
  });
});

describe("day folder reader finds seals under _*/", () => {
  it("finds _seals/<day>.json when there is no root seal.json", () => {
    const dir = dayFolder({
      "suppliers.json": suppliers,
      "products.json": products,
      "_exclude_names.txt": "posco\n",
      "_research/mill_index.json": JSON.stringify({ posco: { wiki: "…" } }),
      "_seals/2026-09-02.json": JSON.stringify({ ...realisticSeal, day: "2026-09-02" }),
      "_seals/2026-09-03.json": JSON.stringify(realisticSeal),
      "enhanced/suppliers/posco/01.jpg": "jpg",
    });
    expect(sealCandidates(dir, "2026-09-03")).toEqual(["_research/mill_index.json", "_seals/2026-09-02.json", "_seals/2026-09-03.json"]);
    expect(findSeal(dir, "2026-09-03")).toBe(join(dir, "_seals/2026-09-03.json"));
    expect(findSeal(dir, "2026-09-02")).toBe(join(dir, "_seals/2026-09-02.json"));

    const folder = readDayFolder(dir, "2026-09-03");
    expect(folder.sealPath).toBe(join(dir, "_seals/2026-09-03.json"));
    expect(parseSeal(folder.seal!.toString("utf8"))?.day).toBe("2026-09-03");
    expect(folder.warnings.some((w) => /No seal found/.test(w))).toBe(false);
  });

  it("accepts nested _qa/…/*.json and a root seal.json first, and warns when none exists", () => {
    const nested = dayFolder({
      "suppliers.json": suppliers,
      "_qa/researcher/ok-2026-09-03.json": JSON.stringify({ date: "2026-09-03", ok: "yes" }),
    });
    expect(findSeal(nested, "2026-09-03")).toBe(join(nested, "_qa/researcher/ok-2026-09-03.json"));

    const root = dayFolder({ "suppliers.json": suppliers, "seal.json": JSON.stringify(realisticSeal), "_seals/x.json": JSON.stringify(realisticSeal) });
    expect(findSeal(root, "2026-09-03")).toBe(join(root, "seal.json"));

    const none = dayFolder({ "suppliers.json": suppliers, "_research/notes.json": "{}" });
    expect(findSeal(none, "2026-09-03")).toBeNull();
    expect(readDayFolder(none, "2026-09-03").warnings.some((w) => /No seal found/.test(w))).toBe(true);
  });
});

describe("push parser accepts seals under _*/ parts", () => {
  it("multipart: `_seals/<day>.json` part becomes the seal, other _*/ files are ignored", async () => {
    const form = new FormData();
    form.set("day", "2026-09-03");
    form.set("suppliers.json", new Blob([suppliers], { type: "application/json" }), "suppliers.json");
    form.set("_seals/2026-09-02.json", new Blob([JSON.stringify({ ...realisticSeal, day: "2026-09-02" })]), "2026-09-02.json");
    form.set("_seals/2026-09-03.json", new Blob([JSON.stringify(realisticSeal)]), "2026-09-03.json");
    form.set("_research/mill_index.json", new Blob([JSON.stringify({ posco: {} })]), "mill_index.json");
    form.set("_exclude_names.txt", new Blob(["posco"]), "_exclude_names.txt");
    form.set("enhanced/suppliers/posco/01.jpg", new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "01.jpg");

    const res = await parsePushRequest(new Request("http://x/api/admin/import/run", { method: "POST", body: form }), { maxBytes: 1_000_000 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(parseSeal(res.payload.seal)?.day).toBe("2026-09-03");
    expect(parseSeal(res.payload.seal)?.held.map((h) => h.key)).toContain("bossard");
    expect(res.payload.files.paths()).toEqual(["enhanced/suppliers/posco/01.jpg"]);
    expect(res.payload.warnings.some((w) => /mill_index\.json/.test(w))).toBe(true);
  });

  it("JSON body: `seals` array and files[_seals/…json] are seal candidates", async () => {
    const body = {
      day: "2026-09-03",
      seals: [{ day: "2026-09-02", researcherOk: true }, realisticSeal],
      suppliers,
    };
    const res = await parsePushRequest(new Request("http://x/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(parseSeal(res.payload.seal)?.day).toBe("2026-09-03");

    const viaFiles = {
      day: "2026-09-03",
      suppliers,
      files: { "_seals/2026-09-03.json": `data:application/json;base64,${Buffer.from(JSON.stringify(realisticSeal)).toString("base64")}` },
    };
    const r2 = await parsePushRequest(new Request("http://x/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(viaFiles) }));
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(parseSeal(r2.payload.seal)?.sealed).toEqual(["posco", "jiuli", "thk", "hiwin"]);
      expect(r2.payload.files.size).toBe(0);
    }
  });
});
