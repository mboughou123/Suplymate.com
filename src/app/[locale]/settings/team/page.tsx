import { localeRedirect } from "@/i18n/redirect";
import { getCurrentAccount } from "@/lib/account";
import TeamSettingsClient from "./TeamSettingsClient";

export default async function TeamSettingsPage() {
  const { authenticated } = await getCurrentAccount();
  if (!authenticated) return await localeRedirect("/login?callbackUrl=/settings/team");
  return <TeamSettingsClient />;
}
