import { redirect } from "next/navigation";
import { checkAdmin } from "@/lib/admin";
import { listAdminSuppliers } from "@/lib/suppliers-store";
import AdminImportSuppliersClient from "./AdminImportSuppliersClient";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({ locale, pathname: "/admin/import-suppliers", titleKey: "adminImportSuppliersTitle", descriptionKey: "adminDescription", robots: { index: false, follow: false } });
}

export const dynamic = "force-dynamic";

export default async function AdminImportSuppliersPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/import-suppliers");
  if (!ok) redirect("/");

  const suppliers = await listAdminSuppliers();

  return <AdminImportSuppliersClient initialSuppliers={suppliers} />;
}
