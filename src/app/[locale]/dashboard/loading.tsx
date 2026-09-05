import { getTranslations } from "next-intl/server";

function Block({ className }: { className: string }) {
  return <div className={`shimmer rounded-xl bg-slate-200/70 ${className}`} aria-hidden />;
}

function CardSkeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`panel-glass p-5 sm:p-6 ${className}`} aria-hidden>
      <div className="flex items-center gap-3">
        <Block className="h-9 w-9 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Block className="h-3.5 w-1/3" />
          <Block className="h-2.5 w-1/2" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Block key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardLoading() {
  const t = await getTranslations("loading");

  return (
    <div className="flex min-h-screen bg-base text-ink" role="status" aria-busy="true">
      <span className="sr-only">{t("dashboard")}</span>

      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block" aria-hidden>
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-4">
          <Block className="h-8 w-8 rounded-lg" />
          <Block className="h-3.5 w-24" />
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Block key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 sm:px-6" aria-hidden>
          <Block className="h-9 w-56" />
          <div className="flex items-center gap-3">
            <Block className="h-9 w-24" />
            <Block className="h-9 w-9" />
            <Block className="h-9 w-32" />
          </div>
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-[1440px] space-y-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" aria-hidden>
              <div className="space-y-3">
                <Block className="h-3 w-40" />
                <Block className="h-9 w-72 sm:w-96" />
                <Block className="h-4 w-64" />
              </div>
              <div className="flex gap-3">
                <Block className="h-11 w-28" />
                <Block className="h-11 w-28" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="panel-glass p-5">
                  <Block className="h-10 w-10 rounded-xl" />
                  <Block className="mt-5 h-3 w-24" />
                  <Block className="mt-2 h-8 w-16" />
                  <Block className="mt-2 h-3 w-32" />
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
                <CardSkeleton rows={4} />
                <CardSkeleton rows={3} />
              </div>
              <div className="space-y-6 xl:col-span-4">
                <CardSkeleton rows={3} className="bg-navy/90" />
                <CardSkeleton rows={4} />
                <CardSkeleton rows={2} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
