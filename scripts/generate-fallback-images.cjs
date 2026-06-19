/*
 * Generates branded, royalty-free SVG fallback images for Suplymate.
 *
 * Why local SVGs: they are zero-dependency, build-safe, never 404, and look
 * intentional (gradient + industrial glyph + category label + wordmark). They
 * are the guaranteed final fallback so NO product/supplier card is ever empty
 * or broken — even with no network / no live database.
 *
 * Run: node scripts/generate-fallback-images.cjs
 */
const fs = require("fs");
const path = require("path");

const PRODUCTS_DIR = path.join(__dirname, "..", "public", "images", "products");
const SUPPLIERS_DIR = path.join(__dirname, "..", "public", "images", "suppliers");
const IMAGES_DIR = path.join(__dirname, "..", "public", "images");

for (const dir of [IMAGES_DIR, PRODUCTS_DIR, SUPPLIERS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Brand palette (matches tailwind.config.ts)
const NAVY = "#0D3349";
const NAVY_DARK = "#081E2D";
const CYAN = "#0284C7";
const CYAN_GLOW = "#38BDF8";
const TEAL = "#0D9488";
const TEAL_GLOW = "#14B8A6";
const EMERALD = "#10B981";

// Industrial line-art glyphs (24x24 viewBox paths, stroke-based, Lucide-style).
const GLYPHS = {
  layers:
    '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  factory:
    '<path d="M2 20h20"/><path d="M4 20V8l6 4V8l6 4V4h4v16"/><path d="M8 20v-4"/><path d="M14 20v-4"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  pipe: '<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M3 12h18"/>',
  cylinder:
    '<ellipse cx="12" cy="6" rx="6" ry="2.5"/><path d="M6 6v12a6 2.5 0 0 0 12 0V6"/>',
  fabric:
    '<path d="M3 6c3 2 6 2 9 0s6-2 9 0"/><path d="M3 12c3 2 6 2 9 0s6-2 9 0"/><path d="M3 18c3 2 6 2 9 0s6-2 9 0"/>',
  briefcase:
    '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2 13h20"/>',
  flask:
    '<path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16Z"/><path d="M4 21c2-6 6-9 12-11"/>',
  building:
    '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
};

// key -> { label, gradient: [from, to], glyph }
const CATEGORIES = {
  steel: { label: "Steel & Metals", grad: [NAVY, CYAN], glyph: "layers" },
  aluminum: { label: "Aluminum", grad: ["#475569", CYAN_GLOW], glyph: "layers" },
  cement: { label: "Cement", grad: ["#334155", TEAL], glyph: "building" },
  construction: { label: "Construction", grad: [NAVY, TEAL], glyph: "building" },
  packaging: { label: "Packaging", grad: [TEAL, EMERALD], glyph: "box" },
  electrical: { label: "Cables & Electrical", grad: [CYAN, "#3B82F6"], glyph: "bolt" },
  machinery: { label: "Machinery Parts", grad: [NAVY_DARK, NAVY], glyph: "cog" },
  industrial: { label: "Industrial Parts", grad: [NAVY_DARK, CYAN], glyph: "cog" },
  textiles: { label: "Textiles", grad: [TEAL, CYAN_GLOW], glyph: "fabric" },
  office: { label: "Office Supplies", grad: [CYAN, TEAL], glyph: "briefcase" },
  pipes: { label: "Tubes & Pipes", grad: [NAVY, TEAL_GLOW], glyph: "pipe" },
  hydraulic: { label: "Hydraulic", grad: ["#1A4A6B", CYAN], glyph: "cylinder" },
  chemicals: { label: "Chemicals", grad: [TEAL, EMERALD], glyph: "flask" },
  agriculture: { label: "Agriculture", grad: [EMERALD, TEAL], glyph: "leaf" },
  default: { label: "Suplymate", grad: [NAVY, CYAN], glyph: "box" },
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function productSvg(key, def) {
  const [from, to] = def.grad;
  const glyph = GLYPHS[def.glyph] || GLYPHS.box;
  const label = esc(def.label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect width="800" height="600" fill="url(#grid)"/>
  <circle cx="640" cy="120" r="180" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="140" cy="500" r="150" fill="#ffffff" fill-opacity="0.05"/>
  <g transform="translate(400 270) scale(7) translate(-12 -12)" fill="none" stroke="#ffffff" stroke-opacity="0.92" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
  <text x="400" y="470" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="34" font-weight="700" fill="#ffffff" fill-opacity="0.96">${label}</text>
  <text x="400" y="520" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600" letter-spacing="3" fill="#ffffff" fill-opacity="0.6">SUPLYMATE</text>
</svg>`;
}

function supplierSvg(key, def) {
  const [from, to] = def.grad;
  const glyph = GLYPHS[def.glyph] || GLYPHS.building;
  const label = esc(def.label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500" role="img" aria-label="${label} supplier">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="500" fill="url(#g)"/>
  <rect width="1200" height="500" fill="url(#grid)"/>
  <circle cx="1040" cy="90" r="220" fill="#ffffff" fill-opacity="0.06"/>
  <circle cx="180" cy="430" r="180" fill="#ffffff" fill-opacity="0.05"/>
  <g transform="translate(600 210) scale(6.5) translate(-12 -12)" fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
  <text x="600" y="390" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="700" fill="#ffffff" fill-opacity="0.95">${label}</text>
</svg>`;
}

let count = 0;
for (const [key, def] of Object.entries(CATEGORIES)) {
  fs.writeFileSync(path.join(PRODUCTS_DIR, `${key}.svg`), productSvg(key, def));
  fs.writeFileSync(path.join(SUPPLIERS_DIR, `${key}.svg`), supplierSvg(key, def));
  count += 2;
}

// Generic top-level placeholders (final fallback of all chains).
fs.writeFileSync(
  path.join(IMAGES_DIR, "placeholder-product.svg"),
  productSvg("default", CATEGORIES.default)
);
fs.writeFileSync(
  path.join(IMAGES_DIR, "placeholder-supplier.svg"),
  supplierSvg("default", CATEGORIES.default)
);
count += 2;

console.log(`Generated ${count} fallback SVGs in public/images/`);
