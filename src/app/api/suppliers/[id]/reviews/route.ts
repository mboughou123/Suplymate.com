import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Public: list PUBLISHED reviews for a supplier.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reviews = await prisma.review
    .findMany({
      where: { supplierId: id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: { name: true } } },
    })
    .catch(() => []);
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / count) * 10) / 10 : null;
  return NextResponse.json({
    average: avg,
    total: count,
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.author?.name ?? "Verified buyer",
      createdAt: r.createdAt,
    })),
  });
}

// Submit a review. ONLY allowed after a qualifying on-platform interaction
// (an RFQ or a conversation with the supplier). Stored as PENDING for moderation.
// No fake "verified purchase" — we record the qualifying interaction type.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  // Qualifying-interaction gate.
  const [rfq, convo] = await Promise.all([
    prisma.rfq.findFirst({ where: { buyerId: session.user.id, supplierId: id }, select: { id: true } }),
    prisma.conversation.findFirst({ where: { buyerId: session.user.id, supplierId: id }, select: { id: true } }),
  ]);
  const qualifyingType = rfq ? "RFQ" : convo ? "CONVERSATION" : null;
  const qualifyingId = rfq?.id ?? convo?.id ?? null;
  if (!qualifyingType) {
    return NextResponse.json(
      { error: "You can review a supplier only after sending an RFQ or starting a conversation with them." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const rating = Math.max(1, Math.min(5, Math.floor(Number(body.rating) || 0)));
  const text = String(body.body || "").trim();
  if (!rating || text.length < 10) {
    return NextResponse.json(
      { error: "Please provide a rating (1-5) and a review of at least 10 characters." },
      { status: 400 }
    );
  }

  try {
    const review = await prisma.review.upsert({
      where: { supplierId_authorId: { supplierId: id, authorId: session.user.id } },
      update: {
        rating,
        title: body.title ? String(body.title).slice(0, 160) : null,
        body: text.slice(0, 4000),
        qualifyingType,
        qualifyingId,
        status: "PENDING",
      },
      create: {
        supplierId: id,
        supplierName: supplier.name,
        authorId: session.user.id,
        rating,
        title: body.title ? String(body.title).slice(0, 160) : null,
        body: text.slice(0, 4000),
        qualifyingType,
        qualifyingId,
        status: "PENDING",
      },
    });
    await recordAudit({
      actorId: session.user.id,
      actor: session.user.email,
      action: "review.submit",
      targetType: "SUPPLIER",
      targetId: id,
      detail: { reviewId: review.id, qualifyingType },
    });
    return NextResponse.json({ ok: true, status: "PENDING" });
  } catch {
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
