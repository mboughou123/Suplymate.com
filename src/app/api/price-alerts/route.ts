import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.priceAlert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ alerts });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const materialId = body.materialId as string;
    const targetPrice = Number(body.targetPrice);
    const notifyType = body.notifyType as string;

    if (!materialId || !targetPrice || !notifyType) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: session.user.id,
        materialId,
        targetPrice,
        notifyType,
      },
    });

    return NextResponse.json({ ok: true, alert });
  } catch {
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
