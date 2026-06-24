import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { removeItem, updateItemQuantity } from "@/lib/cart-store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const cart = await updateItemQuantity(session.user.id, id, Number(body.quantity));
    return NextResponse.json({ cart });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update item" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const cart = await removeItem(session.user.id, id);
  return NextResponse.json({ cart });
}
