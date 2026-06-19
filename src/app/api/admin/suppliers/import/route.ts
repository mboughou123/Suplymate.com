import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import { importSuppliersFromCsv } from "@/lib/supplier-csv";
import { normalizeSupplierInput, findDuplicates } from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";

// POST /api/admin/suppliers/import — upload a CSV and PREVIEW the result.
// Body: { csv: string }   (the admin client reads the file and sends its text)
// Returns valid rows, invalid-row errors, no-contact warnings, and detected
// duplicates so the admin can review BEFORE saving. Nothing is persisted here.
export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;

  let csv = "";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { csv?: string };
      csv = body.csv ?? "";
    } else if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (file && typeof file !== "string") csv = await file.text();
    } else {
      csv = await request.text();
    }
  } catch {
    return NextResponse.json({ error: "Could not read CSV payload." }, { status: 400 });
  }

  if (!csv.trim()) {
    return NextResponse.json({ error: "Empty CSV." }, { status: 400 });
  }

  const parsed = importSuppliersFromCsv(csv);

  // Flag duplicates (against existing DB rows + within the file) for the UI.
  const normalized = parsed.valid.map(normalizeSupplierInput);
  const dupes = await findDuplicates(normalized);
  const duplicates = [...dupes.values()].map((d) => ({
    name: d.candidate.name,
    candidateId: d.candidate.id,
    existingId: d.existingId,
    reason: d.reason,
  }));

  return NextResponse.json({
    headers: parsed.headers,
    recognized: parsed.recognized,
    // Return the normalized previews so the client can render trust scores etc.
    suppliers: normalized,
    errors: parsed.errors,
    warnings: parsed.warnings,
    duplicates,
    counts: {
      valid: parsed.valid.length,
      invalid: parsed.errors.length,
      duplicates: duplicates.length,
    },
  });
}
