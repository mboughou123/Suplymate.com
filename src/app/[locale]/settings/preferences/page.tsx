import { localeRedirect } from "@/i18n/redirect";

// Preferences moved to /settings/notifications; keep old links working.
export default async function PreferencesPage() {
  return await localeRedirect("/settings/notifications");
}
