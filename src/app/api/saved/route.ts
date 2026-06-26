import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.savedItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const productId = String(body.productId || "").trim();
  const supplierId = String(body.supplierId || "").trim();
  if (!productId || !supplierId) {
    return NextResponse.json({ error: "productId and supplierId required" }, { status: 400 });
  }

  await prisma.savedItem.upsert({
    where: {
      userId_productId_supplierId: {
        userId: session.user.id,
        productId,
        supplierId,
      },
    },
    update: {
      productName: String(body.productName || ""),
      supplierName: String(body.supplierName || ""),
      imageUrl: body.imageUrl ?? null,
      unit: body.unit ?? null,
      basePrice: body.basePrice != null ? Number(body.basePrice) : null,
      currency: body.currency ?? null,
    },
    create: {
      userId: session.user.id,
      productId,
      productName: String(body.productName || ""),
      supplierId,
      supplierName: String(body.supplierName || ""),
      imageUrl: body.imageUrl ?? null,
      unit: body.unit ?? null,
      basePrice: body.basePrice != null ? Number(body.basePrice) : null,
      currency: body.currency ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const productId = String(body.productId || "").trim();
  const supplierId = String(body.supplierId || "").trim();
  if (!productId || !supplierId) {
    return NextResponse.json({ error: "productId and supplierId required" }, { status: 400 });
  }
  await prisma.savedItem.deleteMany({
    where: { userId: session.user.id, productId, supplierId },
  });
  return NextResponse.json({ ok: true });
}
