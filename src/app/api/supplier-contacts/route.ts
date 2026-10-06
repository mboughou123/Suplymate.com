import { NextResponse } from "next/server";
import { getSupplierById, getSuppliersFromDb } from "@/lib/data-service";
import { contactViewFor, type ContactView, type ContactViewer } from "@/lib/supplier-contact";
import { logisticsProviderContactView } from "@/lib/logistics-provider-contact";
import { getViewer } from "@/lib/viewer-entitlements";

export const dynamic = "force-dynamic";

const MAX_IDS = 48;

async function viewerFromSession(): Promise<ContactViewer> {
  const { signedIn, plan, email } = await getViewer();
  return { signedIn, plan, email };
}

// GET /api/supplier-contacts?ids=a,b,c
// Paid plans receive phone / email; everyone else only learns whether each
// supplier has them on file, so the locked UI can say so.
export async function GET(request: Request) {
  const ids = [
    ...new Set(
      (new URL(request.url).searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, MAX_IDS);
  if (!ids.length) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const [viewer, directory] = await Promise.all([viewerFromSession(), getSuppliersFromDb()]);
  const byId = new Map(directory.map((s) => [s.id, s]));
  const contacts: Record<string, ContactView> = {};
  for (const id of ids) {
    const provider = logisticsProviderContactView(id, viewer);
    if (provider) {
      contacts[id] = provider;
      continue;
    }
    const supplier = byId.get(id) ?? (await getSupplierById(id));
    if (supplier) contacts[id] = contactViewFor(supplier, viewer);
  }

  return NextResponse.json(
    { contacts },
    { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
  );
}
