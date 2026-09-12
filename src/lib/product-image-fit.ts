// Object-class agreement for catalogue photos.
//
// Stem matching on filenames ("ball" → aerosol can, "transmission" → spray gun)
// is how ALL METAL precision balls and Nexans cable SKUs picked up the wrong
// stills. Brand tokens and short stems must not decide the hero image: the
// dominant object on the product and on the file have to agree.

export type ObjectClass =
  | "aerosol_can"
  | "spray_gun"
  | "beverage_can"
  | "precision_ball"
  | "ball_valve"
  | "bearing"
  | "cable"
  | "pipe"
  | "coil"
  | "packaging"
  | "steel"
  | "unknown";

const BRAND_TOKENS = new Set([
  "all",
  "metal",
  "india",
  "pvt",
  "ltd",
  "llc",
  "inc",
  "corp",
  "corporation",
  "sa",
  "gmbh",
  "co",
  "company",
  "group",
  "house",
  "cables",
  "nexans",
  "foliflex",
  "kei",
  "nsk",
  "skf",
  "lyc",
  "zwz",
  "flowserve",
  "neway",
  "chaoda",
  "amcor",
  "ball", // Ball Corporation brand folder — not a sphere
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1 && !BRAND_TOKENS.has(t));
}

function assertNever(value: never): never {
  throw new Error(`Unhandled object class: ${String(value)}`);
}

function fromCategory(category?: string | null): ObjectClass {
  const raw = (category ?? "").trim().toLowerCase();
  switch (raw) {
    case "cables & electrical":
      return "cable";
    case "tubes & pipes":
      return "pipe";
    case "packaging":
      return "packaging";
    case "steel & metals":
      return "steel";
    case "construction":
    case "industrial parts":
    case "":
      return "unknown";
    default:
      return "unknown";
  }
}

/**
 * Dominant object implied by a product name + category.
 * More specific shapes (aerosol, spray gun, precision ball) win over category.
 */
export function productObjectClass(
  name?: string | null,
  category?: string | null
): ObjectClass {
  const text = `${name ?? ""} ${category ?? ""}`;
  if (/aerosol|\bspray\s*cans?\b/i.test(text)) return "aerosol_can";
  if (/spray[\s-]?gun|paint[\s-]?sprayer/i.test(text)) return "spray_gun";
  if (/\b(beverage|drink|soda)\s+cans?\b|\baluminum\s+cans?\b/i.test(text)) {
    return "beverage_can";
  }
  if (/ball\s+valve|trunnion|floating\s+ball/i.test(text)) return "ball_valve";
  if (/ball\s+bearing|deep\s+groove|angular\s+contact/i.test(text)) return "bearing";
  if (
    /(acrylic|nylon|teflon|ptfe|steel|metal|precision|plastic|ceramic|chrome|tungsten)\s+balls?\b/i.test(
      text
    )
  ) {
    return "precision_ball";
  }
  if (/\b(cable|wire|xlpe|swa|conductor|nexans)\b/i.test(text)) return "cable";
  if (/\b(pipe|tube|tubing|seamless)\b/i.test(text)) return "pipe";
  if (/\b(coil|rebar|beam|plate|sheet|billet)\b/i.test(text)) return "coil";
  if (/\b(box|carton|film|wrap|packag|can(?!non))\b/i.test(text) && /packag/i.test(category ?? "")) {
    return "packaging";
  }
  return fromCategory(category);
}

/**
 * Dominant object implied by a local path or remote filename.
 * `/images/products/ball/aerosol-cans.jpg` is an aerosol can (Ball Corp folder),
 * not a precision ball.
 */
export function imageObjectClass(url?: string | null): ObjectClass {
  if (!url) return "unknown";
  const value = url.trim().toLowerCase();
  const file = value.split("/").pop()?.split("?")[0] ?? value;
  const path = value;

  if (/aerosol|spray-?can|spraycan/.test(path)) return "aerosol_can";
  if (/spray-?gun|spraygun|paint-?sprayer|paint-?gun/.test(path)) return "spray_gun";
  if (/ball-?valve|trunnion|floating-ball/.test(path)) return "ball_valve";
  if (/\bbearing\b|dgbb|acbb/.test(path)) return "bearing";
  if (/(beverage|drink|soda)-?can|can-tab|aluminum-can/.test(path)) return "beverage_can";
  if (/\/ball\/(?!valve)/.test(path) && /can|tab/.test(file)) return "beverage_can";
  if (/\b(cable|wire|xlpe|swa|conductor|housing-wire|sheathed)\b/.test(path)) {
    return "cable";
  }
  if (/\b(pipe|tube|tubing|seamless|erw|lsaw)\b/.test(path)) return "pipe";
  if (/\b(coil|rebar|beam|plate|sheet|billet|section)\b/.test(path)) return "coil";
  if (/\b(box|carton|film|packag|pillow|amprima)\b/.test(path)) return "packaging";
  if (/(acrylic|nylon|teflon|ptfe|precision|steel|metal)-?ball/.test(path)) {
    return "precision_ball";
  }
  return "unknown";
}

function classesCompatible(product: ObjectClass, image: ObjectClass): boolean {
  if (product === "unknown" || image === "unknown") return true;
  if (product === image) return true;
  // Close industrial neighbours that still depict the right object family.
  if (
    (product === "steel" && (image === "coil" || image === "pipe")) ||
    (image === "steel" && (product === "coil" || product === "pipe"))
  ) {
    return true;
  }
  if (product === "packaging" && (image === "aerosol_can" || image === "beverage_can")) {
    return true;
  }
  return false;
}

function isKnownMismatchPair(product: ObjectClass, image: ObjectClass): boolean {
  if (image === "aerosol_can" || image === "spray_gun" || image === "beverage_can") {
    switch (product) {
      case "precision_ball":
      case "cable":
      case "pipe":
      case "coil":
      case "steel":
      case "bearing":
      case "ball_valve":
        return true;
      case "aerosol_can":
      case "spray_gun":
      case "beverage_can":
      case "packaging":
      case "unknown":
        return false;
      default: {
        const _never: never = product;
        return assertNever(_never);
      }
    }
  }
  return false;
}

/**
 * True when this URL is allowed as the hero for this product.
 * Category SVGs are rejected by the caller; this only checks object agreement.
 */
export function imageFitsProduct(
  url: string | null | undefined,
  productName?: string | null,
  category?: string | null
): boolean {
  if (!url?.trim()) return false;
  const product = productObjectClass(productName, category);
  const image = imageObjectClass(url);
  if (isKnownMismatchPair(product, image)) return false;
  if (!classesCompatible(product, image)) return false;

  // Extra filename guards: a lone "ball" token in a product name must not
  // inherit aerosol/can files, even if the image class came back unknown.
  const file = url.toLowerCase();
  if (
    product === "precision_ball" &&
    /aerosol|spray|can-tab|aluminum-can|\/ball\//.test(file)
  ) {
    return false;
  }
  if (product === "cable" && /spray|aerosol|gun/.test(file)) return false;
  return true;
}

/** Tokens that must never drive assignment (exported for catalog-builder tests). */
export function isBrandToken(token: string): boolean {
  return BRAND_TOKENS.has(token.toLowerCase());
}

export function productNameTokens(name: string): string[] {
  return tokens(name);
}
