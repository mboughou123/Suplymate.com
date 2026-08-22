// One-time repair for scripts/translation-maps/*.json.
//
// The maps were produced by word-substituting a French translation, and the
// substitution ran inside ICU placeholders and keywords. That turned
// "MOQ {value}" into "MOQ {va<read>e}" and "plural" into "p<read>ral", which
// makes next-intl throw and render the raw key path ("common.moq") as visible
// text.
//
// A corrupted entry is dropped rather than patched: the generator falls back to
// the English source string (walkTranslate uses `map[v] ?? v`), which renders
// correctly. Patching only the ICU tokens would keep the surrounding French
// residue, producing mixed-script output like "# サプライヤー trouvé".
//
// Usage: node scripts/repair-translation-map-icu.mjs [--dry]

import fs from "node:fs";
import path from "node:path";

const MAPS_DIR = "scripts/translation-maps";
const DRY = process.argv.includes("--dry");
const ICU_FUNCTIONS = ["plural", "select", "selectordinal", "number", "date", "time"];

/**
 * Names of true ICU arguments, sorted for order-insensitive compare.
 *
 * The trailing `[,}]` is essential: it distinguishes an argument ("{count,"
 * or "{value}") from ordinary translated words opening a plural branch
 * ("{No suppliers found}"), which must not be treated as a placeholder.
 */
function placeholderNames(s) {
  return [...s.matchAll(/\{\s*([A-Za-z0-9_]+)\s*[,}]/g)]
    .map((m) => m[1])
    .sort()
    .join(",");
}

/** True when the translation no longer carries the English ICU structure. */
function isCorrupted(en, translated) {
  if (typeof translated !== "string") return false;
  if (!en.includes("{")) return false;
  if (placeholderNames(en) !== placeholderNames(translated)) return true;
  // An ICU function name must survive verbatim, e.g. "{count, plural, ...}".
  return ICU_FUNCTIONS.some(
    (fn) => en.includes(`, ${fn},`) && !translated.includes(`, ${fn},`)
  );
}

let grandTotal = 0;
for (const file of fs.readdirSync(MAPS_DIR).filter((f) => f.endsWith(".json"))) {
  const full = path.join(MAPS_DIR, file);
  const map = JSON.parse(fs.readFileSync(full, "utf8"));
  const dropped = [];

  for (const [en, translated] of Object.entries(map)) {
    if (isCorrupted(en, translated)) {
      dropped.push(en);
      delete map[en];
    }
  }

  grandTotal += dropped.length;
  console.log(`${file}: dropped ${dropped.length} ICU-corrupted entries`);
  for (const en of dropped) console.log(`    ${JSON.stringify(en.slice(0, 72))}`);

  if (!DRY && dropped.length) {
    fs.writeFileSync(full, JSON.stringify(map, null, 2) + "\n", "utf8");
  }
}

console.log(`\n${DRY ? "[dry run] would drop" : "dropped"} ${grandTotal} entries total`);
console.log("Next: node scripts/generate-locale-messages.mjs");
