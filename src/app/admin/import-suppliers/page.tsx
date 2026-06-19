import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { listAdminSuppliers } from "@/lib/suppliers-store";
import AdminImportSuppliersClient from "./AdminImportSuppliersClient";

export const metadata: Metadata = {
  title: "Import suppliers · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminImportSuppliersPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/import-suppliers");
  if (!ok) redirect("/");

  const suppliers = await listAdminSuppliers();

  return <AdminImportSuppliersClient initialSuppliers={suppliers} />;
}
