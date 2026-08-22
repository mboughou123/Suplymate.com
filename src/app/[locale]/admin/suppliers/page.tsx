import { redirect } from "next/navigation";
import { checkAdmin } from "@/lib/admin";
import { listAdminSuppliers } from "@/lib/suppliers-store";
import AdminSuppliersClient from "./AdminSuppliersClient";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({ locale, pathname: "/admin/suppliers", titleKey: "adminSuppliersTitle", descriptionKey: "adminDescription", robots: { index: false, follow: false } });
}

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
