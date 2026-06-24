import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { listAdminSuppliers } from "@/lib/suppliers-store";
import AdminSuppliersClient from "./AdminSuppliersClient";

export const metadata: Metadata = {
  title: "Supplier media · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSuppliersPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/suppliers");
  if (!ok) redirect("/");

  const suppliers = await listAdminSuppliers();
  return (
    <AdminSuppliersClient
      suppliers={suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        country: s.country,
        category: s.category,
        logoUrl: s.logoUrl,
        imageUrl: s.imageUrl,
        verificationStatus: s.verificationStatus,
      }))}
    />
  );
}
