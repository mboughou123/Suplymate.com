import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/account";
import AccountForm from "@/components/settings/AccountForm";

export default async function AccountPage() {
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) redirect("/login?callbackUrl=/settings/account");

  // Derive first/last from `name` when the dedicated fields are empty.
  const nameParts = (user.name || "").trim().split(/\s+/);
  const firstName = user.firstName ?? (nameParts[0] || "");
  const lastName = user.lastName ?? (nameParts.slice(1).join(" ") || "");

  return (
    <AccountForm
      initial={{
        firstName,
        lastName,
        email: user.email,
        company: user.company ?? "",
        jobTitle: user.jobTitle ?? "",
        phone: user.phone ?? "",
        image: user.image ?? "",
      }}
    />
  );
}
