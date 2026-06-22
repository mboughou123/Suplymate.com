import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SettingsNav from "@/components/settings/SettingsNav";

export const metadata = {
  title: "Settings · Suplymate",
  description: "Manage your Suplymate account, security, billing, and preferences.",
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/settings");

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage your account, security, billing, and preferences.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <SettingsNav />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
