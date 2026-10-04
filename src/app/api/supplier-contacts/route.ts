import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSupplierById, getSuppliersFromDb } from "@/lib/data-service";
import { contactViewFor, type ContactView, type ContactViewer } from "@/lib/supplier-contact";
import { logisticsProviderContactView } from "@/lib/logistics-provider-contact";

export const dynamic = "force-dynamic";

const MAX_IDS = 48;

async function viewerFromSession(): Promise<ContactViewer> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return { signedIn: false, plan: null };
  const user = await prisma.user
    .findUnique({ where: { id: userId }, select: { plan: true } })
    .catch(() => null);
  return { signedIn: true, plan: user?.plan ?? null };
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
