"use client";

import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { LayoutDashboard, Factory, Atom, LogOut } from "lucide-react";
import { homeForRole } from "@/lib/roles";

export default function WorkspaceTopBar({ engine }: { engine: "openai" | "demo" | null }) {
  const nav = useTranslations("navigation");
  const { data: session, status } = useSession();
  const home = homeForRole(session?.user?.role);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#050B12]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-display text-lg font-bold tracking-tight text-white">
            {nav("brandSuply")}
            <span className="gradient-text-light">{nav("brandMate")}</span>
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60 sm:inline-flex">
            <span className={`h-1.5 w-1.5 rounded-full ${engine === "openai" ? "bg-emerald-400" : "bg-amber-300"}`} />
            {engine === "openai" ? "Live AI + Suplymate data" : engine === "demo" ? "Demo narrative · real data" : "Connecting…"}
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Workspace">
          <Link href={home} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">
            <LayoutDashboard className="h-4 w-4" aria-hidden /> {nav("dashboard")}
          </Link>
          <Link href="/suppliers" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">
            <Factory className="h-4 w-4" aria-hidden /> {nav("suppliers")}
          </Link>
          <Link href="/materials" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">
            <Atom className="h-4 w-4" aria-hidden /> Materials
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {status === "authenticated" ? (
            <>
              <span className="hidden text-xs text-white/60 sm:block">{session?.user?.name}</span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-lg border border-white/15 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={nav("signOut")}
                title={nav("signOut")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : status === "loading" ? (
            <span className="h-8 w-20" />
          ) : (
            <>
              <Link href="/login?callbackUrl=/ai-assistant" className="rounded-lg px-3 py-2 text-sm text-white/80 hover:text-white">
                {nav("login")}
              </Link>
              <Link href="/signup" className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-navy-deep transition hover:bg-cyan-glow">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
