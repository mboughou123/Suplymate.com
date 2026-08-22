export default function PriceChartsLoading() {
  return (
    <div className="min-h-screen bg-transparent" aria-busy="true">
      <div className="bg-gradient-to-br from-navy-dark to-navy py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-10 w-72 animate-pulse rounded-lg bg-white/15" />
          <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-white/10" />
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[18rem_1fr] lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="space-y-6">
          <div className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-[28rem] animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
