import { localeRedirect } from "@/i18n/redirect";
import { getCurrentAccount } from "@/lib/account";
import { parsePreferences } from "@/lib/preferences";
import PreferencesForm from "@/components/settings/PreferencesForm";

export default async function PreferencesPage() {
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) return await localeRedirect("/login?callbackUrl=/settings/preferences");

  const prefs = parsePreferences(user.preferences);
  return <PreferencesForm initial={prefs} />;
}
