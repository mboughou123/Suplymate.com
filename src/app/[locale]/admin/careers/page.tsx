import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Briefcase, Download } from "lucide-react";
import { checkStrictAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Job applications · Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCareersPage() {
  const { ok, authenticated, allowlistConfigured } = await checkStrictAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/careers");
  if (!ok && allowlistConfigured) redirect("/");

  const applications = ok
    ? await prisma.careerApplication
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            location: true,
            linkedin: true,
            cvUrl: true,
            cvFileName: true,
            message: true,
            emailedAt: true,
            createdAt: true,
          },
        })
        .catch(() => [])
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm text-ink-muted hover:text-cyan">← Admin</Link>
      <h1 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Briefcase className="h-6 w-6 text-cyan" aria-hidden />
        Job applications
      </h1>
      <p className="mt-1 text-sm text-ink-muted">Everything submitted through the careers form, newest first.</p>

      {!allowlistConfigured ? (
        <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Applications contain personal data, so this page needs an explicit admin list. Set{" "}
          <code className="rounded bg-white px-1">ADMIN_EMAILS</code> in Vercel to your email, then redeploy.
        </p>
      ) : applications.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          No applications yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {applications.map((a) => (
            <li key={a.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{a.name}</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{a.role}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    a.emailedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {a.emailedAt ? "Emailed" : "Not emailed"}
                </span>
                <span className="ml-auto text-xs text-ink-dim">{a.createdAt.toISOString().slice(0, 10)}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                <a href={`mailto:${a.email}`} className="text-cyan hover:underline">{a.email}</a>
                {a.phone && ` · ${a.phone}`}
                {a.location && ` · ${a.location}`}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{a.message}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                {a.cvFileName && (
                  <a href={`/api/admin/careers/${a.id}/cv`} className="inline-flex items-center gap-1 text-cyan hover:underline">
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    {a.cvFileName}
                  </a>
                )}
                {a.cvUrl && (
                  <a href={a.cvUrl} target="_blank" rel="noreferrer" className="text-cyan hover:underline">CV link</a>
                )}
                {a.linkedin && (
                  <a href={a.linkedin} target="_blank" rel="noreferrer" className="text-cyan hover:underline">LinkedIn</a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
