import { localeRedirect } from "@/i18n/redirect";
import { getCurrentAccount } from "@/lib/account";
import BusinessForm from "@/components/settings/BusinessForm";

export default async function BusinessSettingsPage() {
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) return await localeRedirect("/login?callbackUrl=/settings/business");

  return (
    <BusinessForm
      initial={{
        company: user.company ?? "",
        companyType: user.companyType ?? "",
        industry: user.industry ?? "",
        location: user.location ?? "",
        bio: user.bio ?? "",
        procurementInterests: user.procurementInterests,
        preferredMaterials: user.preferredMaterials,
      }}
    />
  );
}
