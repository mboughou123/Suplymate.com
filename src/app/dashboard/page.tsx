import Link from "next/link";
import { Factory, Package, Bell, Bot } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const alertCount = await prisma.priceAlert.count({
    where: { userId: session.user.id },
  });

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">
              Welcome, {session.user.name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="mt-2 text-white/75">{session.user.email}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Suppliers", href: "/suppliers", value: "Browse", icon: Factory },
            { label: "Products", href: "/products", value: "Compare", icon: Package },
            { label: "Price alerts", href: "/price-charts", value: String(alertCount), icon: Bell },
            { label: "AI Assistant", href: "/ai-assistant", value: "Ask", icon: Bot },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="glass-card glass-hover p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mustard/15 text-ink">
                <card.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="mt-3 text-sm text-ink-dim">{card.label}</p>
              <p className="text-xl font-semibold text-ink">{card.value}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-mustard/30 bg-mustard/15/40 p-6">
          <h2 className="font-semibold text-ink">Your procurement hub</h2>
          <p className="mt-2 text-sm text-ink-muted max-w-2xl">
            Use Suppliers to find vendors, Products to compare offers, Price Charts for
            market timing, and the AI Assistant for recommendations. Price alerts you
            create while signed in are saved to your account ({alertCount} active).
          </p>
        </div>
      </div>
    </div>
  );
}
