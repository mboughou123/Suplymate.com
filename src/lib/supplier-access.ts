import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

// Which suppliers may a given user act on behalf of? A user controls a supplier
// once their claim has been APPROVED (supplier.claimedByUserId is set on
// approval). Admins can act on any supplier.

export async function getClaimedSupplierIds(userId: string): Promise<string[]> {
  try {
    const rows = await prisma.supplier.findMany({
      where: { claimedByUserId: userId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

export async function canManageSupplier(
  userId: string,
  email: string | null | undefined,
  supplierId: string
): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { claimedByUserId: true },
    });
    return supplier?.claimedByUserId === userId;
  } catch {
    return false;
  }
}
