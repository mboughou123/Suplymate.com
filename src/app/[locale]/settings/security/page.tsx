import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import DangerZone from "@/components/settings/DangerZone";
import SessionActions from "@/components/settings/SessionActions";

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/settings/security");

  return (
    <div className="space-y-6">
      <ChangePasswordForm />
      <SessionActions />
      <DangerZone />
    </div>
  );
}
