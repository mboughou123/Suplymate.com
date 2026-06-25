import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";
import TeamSettingsClient from "./TeamSettingsClient";

export default async function TeamSettingsPage() {
  const { authenticated } = await getCurrentAccount();
  if (!authenticated) redirect("/login?callbackUrl=/settings/team");
  return <TeamSettingsClient />;
}
