// Tiny dependency-free CSV parser + supplier-row mapper.
//
// Handles quoted fields, escaped quotes (""), commas/newlines inside quotes, and
// CRLF/LF line endings. Good enough for hand-made or exported supplier CSVs
// without adding a parser dependency.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  // Strip a UTF-8 BOM if present.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      // Handle CRLF: skip the \n after \r.
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // Skip fully-empty lines.
      if (row.length > 1 || row[0].trim() !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Flush the last field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
  }
  return rows;
}

/** Map header names to our canonical supplier fields (case/space-insensitive). */
const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  company: "name",
  companyname: "name",
  suppliername: "name",
  industry: "industry",
  sector: "industry",
  category: "category",
  country: "country",
  city: "city",
  location: "location",
  address: "address",
  website: "website",
  url: "website",
  site: "website",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  email: "email",
  mail: "email",
  description: "description",
  about: "description",
  logo: "logoUrl",
  logourl: "logoUrl",
  image: "imageUrl",
  imageurl: "imageUrl",
  banner: "imageUrl",
  images: "images",
  productimages: "images",
  certificationimages: "certificationImages",
  certimages: "certificationImages",
  certifications: "certifications",
  certs: "certifications",
  products: "products",
  moq: "moq",
  minimumorderquantity: "moq",
  rating: "rating",
  reviews: "reviewCount",
  reviewcount: "reviewCount",
  source: "sourceUrl",
  sourceurl: "sourceUrl",
};

function canonicalHeader(raw: string): string | null {
  const key = raw.toLowerCase().replace(/[\s_-]+/g, "");
  return HEADER_ALIASES[key] ?? null;
}

export type CsvSupplierRow = {
  /** 1-based row number in the source file (header is row 1). */
  line: number;
  raw: Record<string, string>;
  values: Record<string, string>;
};

export type CsvParseResult = {
  headers: string[];
  /** Canonical field names recognised from the header row. */
  recognized: string[];
  rows: CsvSupplierRow[];
};

const LIST_FIELDS = new Set(["products", "images", "certificationImages"]);

/** Split a multi-value CSV cell on common separators (| ; newline). */
export function splitList(value: string): string[] {
  return value
    .split(/[|;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse a supplier CSV into header metadata + per-row canonical value maps.
 * Unknown columns are preserved in `raw` but ignored for mapping.
 */
export function parseSupplierCsv(text: string): CsvParseResult {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { headers: [], recognized: [], rows: [] };
  }
  const headers = table[0].map((h) => h.trim());
  const canon = headers.map(canonicalHeader);
  const recognized = canon.filter((c): c is string => !!c);

  const rows: CsvSupplierRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const raw: Record<string, string> = {};
    const values: Record<string, string> = {};
    headers.forEach((h, i) => {
      const cell = (cells[i] ?? "").trim();
      raw[h] = cell;
      const field = canon[i];
      if (field && cell) values[field] = cell;
    });
    rows.push({ line: r + 1, raw, values });
  }
  return { headers, recognized, rows };
}

export { LIST_FIELDS };
