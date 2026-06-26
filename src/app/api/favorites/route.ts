import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { entitlementsFor } from "@/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const favorites = await prisma.favoriteSupplier.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const supplierId = String(body.supplierId || "").trim();
  const supplierName = String(body.supplierName || "").trim();
  if (!supplierId || !supplierName) {
    return NextResponse.json({ error: "Missing supplier" }, { status: 400 });
  }

  // Toggle behavior: remove if it exists, else add.
  const existing = await prisma.favoriteSupplier.findUnique({
    where: { userId_supplierId: { userId: session.user.id, supplierId } },
  });
  if (existing) {
    await prisma.favoriteSupplier.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  const ent = entitlementsFor(user?.plan);
  if (ent.savedSuppliersLimit != null) {
    const count = await prisma.favoriteSupplier.count({ where: { userId: session.user.id } });
    if (count >= ent.savedSuppliersLimit) {
      return NextResponse.json(
        {
          error: `Free plan allows ${ent.savedSuppliersLimit} saved suppliers. Upgrade to save more.`,
        },
        { status: 403 }
      );
    }
  }

  await prisma.favoriteSupplier.create({
    data: { userId: session.user.id, supplierId, supplierName },
  });
  return NextResponse.json({ favorited: true });
}
