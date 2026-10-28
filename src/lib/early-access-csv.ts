import { parseStoredCategories } from "@/lib/early-access";

export type EarlyAccessCsvRow = {
  email: string;
  name: string | null;
  company: string | null;
  role: string | null;
  categories: string;
  note: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPath: string | null;
  locale: string | null;
  createdAt: Date;
};

const HEADERS = [
  "email",
  "name",
  "company",
  "role",
  "categories",
  "note",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "referrer",
  "landing_path",
  "locale",
  "created_at",
] as const;

function cell(value: string): string {
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function signupsToCsv(rows: EarlyAccessCsvRow[]): string {
  const lines = [HEADERS.join(",")];
  for (const row of rows) {
    const values = [
      row.email,
      row.name ?? "",
      row.company ?? "",
      row.role ?? "",
      parseStoredCategories(row.categories).join("; "),
      row.note ?? "",
      row.utmSource ?? "",
      row.utmMedium ?? "",
      row.utmCampaign ?? "",
      row.utmContent ?? "",
      row.referrer ?? "",
      row.landingPath ?? "",
      row.locale ?? "",
      row.createdAt.toISOString(),
    ];
    lines.push(values.map((value) => cell(value)).join(","));
  }
  return `${lines.join("\n")}\n`;
}
