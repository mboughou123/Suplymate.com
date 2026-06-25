import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ watchlist: items.map((w) => w.materialId) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const materialId = String(body.materialId || "").trim();
  if (!materialId) {
    return NextResponse.json({ error: "materialId required" }, { status: 400 });
  }
  await prisma.watchlist.upsert({
    where: { userId_materialId: { userId: session.user.id, materialId } },
    update: {},
    create: { userId: session.user.id, materialId },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get("materialId");
  if (!materialId) {
    return NextResponse.json({ error: "materialId required" }, { status: 400 });
  }
  await prisma.watchlist.deleteMany({
    where: { userId: session.user.id, materialId },
  });
  return NextResponse.json({ ok: true });
}
