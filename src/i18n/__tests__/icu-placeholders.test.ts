import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  findIcuProblems,
  parseIcu,
  protectIcuPlaceholders,
  serializeIcu,
} from "../../../scripts/lib/icu-placeholders.mjs";
import { routing } from "../routing";

const MESSAGES_DIR = path.resolve(__dirname, "../../../messages");

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[p] = value;
    else if (value && typeof value === "object") {
      Object.assign(out, flatten(value as Record<string, unknown>, p));
    }
  }
  return out;
}

function loadMessages(locale: string): Record<string, string> {
  const raw = fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8");
  return flatten(JSON.parse(raw) as Record<string, unknown>);
}

describe("ICU placeholder helpers", () => {
  it("round-trips plural messages", () => {
    const msg = "{count, plural, =0 {No suppliers found} one {# supplier found} other {# suppliers found}}";
    expect(serializeIcu(parseIcu(msg))).toBe(msg);
  });

  it("restores argument names and keywords mangled by translation", () => {
    expect(protectIcuPlaceholders("MOQ {value}", "MOQ {vaمقروءe}")).toEqual({
      value: "MOQ {value}",
      fellBack: false,
    });
    expect(
      protectIcuPlaceholders(
        "Page {current} of {total} · showing {shown} of {totalResults}",
        "Page {current} sur {总计} · {shown} sur {总计Results} 显示",
      ).value,
    ).toBe("Page {current} sur {total} · {shown} sur {totalResults} 显示");
    expect(
      protectIcuPlaceholders(
        "{count, plural, one {# supplier} other {# suppliers}}",
        "{count, p已读ral, one {# 供应商} other {# 供应商}}",
      ).value,
    ).toBe("{count, plural, one {# 供应商} other {# 供应商}}");
  });

  it("falls back to English when a placeholder was dropped", () => {
    expect(protectIcuPlaceholders("Hello {name}", "Bonjour")).toEqual({
      value: "Hello {name}",
      fellBack: true,
    });
  });
});

describe("locale message files", () => {
  const en = loadMessages("en");
  const locales = routing.locales.filter((l) => l !== "en");

  it.each(locales)("%s keeps every ICU placeholder identical to en.json", (locale) => {
    const messages = loadMessages(locale);
    const problems: string[] = [];
    for (const [key, source] of Object.entries(en)) {
      if (!source.includes("{")) continue;
      const translated = messages[key];
      if (typeof translated !== "string") {
        problems.push(`${key}: missing`);
        continue;
      }
      for (const problem of findIcuProblems(source, translated)) {
        problems.push(`${key}: ${problem}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it.each(locales)("%s keeps list values as arrays (t.raw() callers map over them)", (locale) => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8"),
    ) as Record<string, Record<string, unknown>>;
    expect(Array.isArray(raw.about.problemList)).toBe(true);
    expect(Array.isArray(raw.careers.applySteps)).toBe(true);
  });
});
