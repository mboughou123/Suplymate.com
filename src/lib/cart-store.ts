import { prisma } from "@/lib/prisma";

// Server-side procurement cart. One Cart per authenticated user. Guest carts
// live in localStorage and merge on login (see /api/cart/merge).
//
// SECURITY: every mutation is scoped to the caller's own cart. The browser may
// suggest a price/MOQ but the server stores only honest snapshots — totals are
// never computed from cart prices; real numbers come from supplier quotes.

export type CartItemInput = {
  productId?: string | null;
  productName: string;
  supplierId: string;
  supplierName: string;
  imageUrl?: string | null;
  unit?: string | null;
  quantity?: number | null;
  moq?: number | null;
  basePrice?: number | null;
  currency?: string | null;
  note?: string | null;
  sourceUrl?: string | null;
};

export type SerializedCartItem = {
  id: string;
  productId: string | null;
  productName: string;
  supplierId: string;
  supplierName: string;
  imageUrl: string | null;
  unit: string | null;
  quantity: number;
  moq: number | null;
  basePrice: number | null;
  currency: string | null;
  note: string | null;
  sourceUrl: string | null;
};

export type SerializedCart = {
  id: string;
  items: SerializedCartItem[];
  itemCount: number;
  supplierCount: number;
};

export { parseMoq } from "@/lib/moq";

function sanitizeInput(input: CartItemInput) {
  const moq = input.moq && input.moq > 0 ? Math.floor(input.moq) : null;
  const requested = input.quantity && input.quantity > 0 ? Math.floor(input.quantity) : null;
  // Default quantity to MOQ when known, else 1.
  const quantity = Math.max(1, requested ?? moq ?? 1);
  return {
    productId: input.productId?.trim() || null,
    productName: String(input.productName || "").trim().slice(0, 300) || "Product",
    supplierId: String(input.supplierId || "").trim(),
    supplierName: String(input.supplierName || "").trim() || "Supplier",
    imageUrl: input.imageUrl?.trim() || null,
    unit: input.unit?.trim() || null,
    quantity,
    moq,
    basePrice:
      input.basePrice != null && Number.isFinite(input.basePrice) && input.basePrice >= 0
        ? input.basePrice
        : null,
    currency: input.currency?.trim() || null,
    note: input.note?.trim()?.slice(0, 1000) || null,
    sourceUrl: input.sourceUrl?.trim() || null,
  };
}

export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

function serialize(items: Array<{
  id: string;
  productId: string | null;
  productName: string;
  supplierId: string;
  supplierName: string;
  imageUrl: string | null;
  unit: string | null;
  quantity: number;
  moq: number | null;
  basePrice: number | null;
  currency: string | null;
  note: string | null;
  sourceUrl: string | null;
}>, cartId: string): SerializedCart {
  const suppliers = new Set(items.map((i) => i.supplierId));
  return {
    id: cartId,
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      supplierId: i.supplierId,
      supplierName: i.supplierName,
      imageUrl: i.imageUrl,
      unit: i.unit,
      quantity: i.quantity,
      moq: i.moq,
      basePrice: i.basePrice,
      currency: i.currency,
      note: i.note,
      sourceUrl: i.sourceUrl,
    })),
    itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
    supplierCount: suppliers.size,
  };
}

export async function getCart(userId: string): Promise<SerializedCart> {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: "asc" },
  });
  return serialize(items, cart.id);
}

export async function addItem(userId: string, input: CartItemInput): Promise<SerializedCart> {
  const cart = await getOrCreateCart(userId);
  const data = sanitizeInput(input);
  if (!data.supplierId) throw new Error("supplierId is required");

  // Dedupe: same catalogue product + supplier => bump quantity to at least the
  // larger of the two requested quantities.
  if (data.productId) {
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: data.productId, supplierId: data.supplierId },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.max(existing.quantity, data.quantity) },
      });
      await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
      return getCart(userId);
    }
  }

  await prisma.cartItem.create({ data: { ...data, cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return getCart(userId);
}

export async function updateItemQuantity(
  userId: string,
  itemId: string,
  quantity: number
): Promise<SerializedCart> {
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
  if (!item) throw new Error("Item not found");
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: qty } });
  return getCart(userId);
}

export async function removeItem(userId: string, itemId: string): Promise<SerializedCart> {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return getCart(userId);
}

export async function clearCart(userId: string): Promise<SerializedCart> {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getCart(userId);
}

// Merge guest (localStorage) items into the user's server cart on login.
export async function mergeGuestItems(
  userId: string,
  guestItems: CartItemInput[]
): Promise<SerializedCart> {
  for (const raw of guestItems.slice(0, 100)) {
    try {
      if (!raw?.supplierId) continue;
      await addItem(userId, raw);
    } catch {
      // skip malformed guest items
    }
  }
  return getCart(userId);
}
