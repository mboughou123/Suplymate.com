import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { localeRedirect } from "@/i18n/redirect";
import { getOwnedSupplier } from "@/lib/supplier-owner";
import SupplierShell from "@/components/supplier/SupplierShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "supplierDashboard" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("title") }),
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function SupplierDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return await localeRedirect("/login?role=supplier&callbackUrl=/supplier-dashboard");
  }
  const profile = await getOwnedSupplier(session.user.id);

  return (
    <SupplierShell
      user={{ name: session.user.name ?? "Supplier", email: session.user.email ?? "" }}
      profile={
        profile
          ? {
              id: profile.id,
              name: profile.name,
              verified: profile.verified,
              verificationStatus: profile.verificationStatus,
            }
          : null
      }
    >
      {children}
    </SupplierShell>
  );
}
