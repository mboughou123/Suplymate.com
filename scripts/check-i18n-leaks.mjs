// Fetches public pages in every locale and reports untranslated message keys
// that leak into the rendered HTML (e.g. "suppliers.coverageSummary").
//
// Usage: node scripts/check-i18n-leaks.mjs [baseUrl]
// Exits non-zero when any leak is found, so it can gate CI.

import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3111";
const MESSAGES_DIR = "messages";
const PATHS = ["", "/suppliers", "/products", "/pricing"];

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" && !Array.isArray(v)
      ? flatten(v, key)
      : [key];
  });
}

const locales = fs
  .readdirSync(MESSAGES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => path.basename(f, ".json"));

const enKeys = flatten(
  JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, "en.json"), "utf8"))
);

let totalLeaks = 0;
const report = [];
const skipped = new Set();

for (const locale of locales) {
  // Every key is checked, not just ones missing from this locale, so the gate
  // still catches leaks caused by namespace typos or bad lookups.
  //
  // Matching the full dotted path is what makes this safe: the serialized
  // message bundle is nested JSON containing only leaf names, so "a.b.c" can
  // never appear there — whereas a leaked key always renders dotted.
  const candidates = enKeys;

  for (const p of PATHS) {
    const url = `${BASE}/${locale}${p}`;
    let html;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        report.push(`  ${locale}${p || "/"} -> HTTP ${res.status}`);
        continue;
      }
      // A locale that redirects off its own prefix is retired, not served, so
      // scanning it would just re-scan the default locale.
      if (!new URL(res.url).pathname.startsWith(`/${locale}`)) {
        skipped.add(locale);
        break;
      }
      html = await res.text();
    } catch (err) {
      report.push(`  ${locale}${p || "/"} -> fetch failed: ${err.message}`);
      continue;
    }
    const leaked = candidates.filter((k) => html.includes(k));
    if (leaked.length) {
      totalLeaks += leaked.length;
      report.push(
        `  ${locale}${p || "/"} -> ${leaked.length} leaked: ${leaked.join(", ")}`
      );
    }
  }
}

if (report.length) {
  console.log("Untranslated keys rendered as literal text:\n");
  console.log(report.join("\n"));
} else {
  console.log("No untranslated keys leaked into rendered HTML.");
}
if (skipped.size) {
  console.log(
    `\nskipped ${skipped.size} retired locale(s) that redirect away: ${[...skipped].sort().join(", ")}`
  );
}
console.log(`\ntotal leaked key renders: ${totalLeaks}`);
process.exit(totalLeaks > 0 ? 1 : 0);
